import * as dotenv from 'dotenv';
import express from 'express';
import postgres from 'postgres';

dotenv.config();

const app = express();
const port = 3000;

const sql = postgres({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
});

import { RESOURCE_TYPES, API_RETURN_MESSAGES } from './api/constants.js';

const metersPerMile = 1609.34;
const metersToDistanceApproximation = meters => {
  if (meters < 2 * metersPerMile) return "< 2 miles"
  else if (meters < 5 * metersPerMile) return "< 5 miles"
  else if (meters < 10 * metersPerMile) return "< 10 miles"
  else if (meters < 15 * metersPerMile) return "< 15 miles"
  else if (meters < 25 * metersPerMile) return "< 25 miles"
  else return "> 25 miles"
}

// Gives the distance in meters between the given PostGIS point and selected resources.
// Example of point: `POINT(-121.2352251 85.22345752)`
const distance_sql = (point) => sql`ST_DistanceSpheroid(
  ST_GeomFromText(${point}, 4326), 
  resources.location, 
  'SPHEROID["WGS 84",6378137,298.257223563]'
) as distance_meters`;

app.get('/', async (req, res) => {
  const [{ '?column?': one }] = await sql`select 1;`;
  res.send(`Hello World! Here's a number from Postgres: ${one}`);
});

// GET /api/item endpoint
app.get('/api/item', async (req, res) => {
  // Get query parameters
  const { lat, long, max_distance } = req.query;
  if (!lat || !long || !max_distance) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "Please provide all required query parameters (max_distance, lat, and long)"
    });
  }

  // max distance needs to be a positive number
  if (max_distance < 1) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "max_distance cannot be less than 1"
    });
  }

  try {
    // Select resources, join owner and one image per resource
    const point = `POINT(${long} ${lat})`;
    const resources = await sql`
      select distinct on (resources.id)
        resources.id, resources.name, type, quantity, users.name as seller, content as image, ${distance_sql(point)}
      from resources 
      left outer join users on users.id = owned_by 
      left outer join images on resource_id = resources.id 
      where ST_DWithin(
        ST_GeomFromText(${point}, 4326),
        resources.location::geography,
        ${max_distance * metersPerMile}
      )`;

    // Convert the resources' exact distance in meters to an approximation in miles
    for (let resource of resources) {
      resource.distance = metersToDistanceApproximation(resource.distance_meters);
      delete resource.distance_meters;
    }

    res.send(resources);
  } catch (error) {
    console.error(error);

    res.send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
});

// GET /api/item/:id endpoint
app.get('/api/item/:id', async (req, res) => {
  // Parse item ID
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "please provide a numeric item ID"
    });
  }

  try {
    // Get the resource
    const [resource] = await sql`
      select resources.id, resources.name, type, quantity, users.name as seller, email as seller_email, phone_number as seller_phone
      from resources left outer join users on users.id = owned_by where resources.id = ${id};`;

    // If undefined, this item doesn't exist
    if (!resource) {
      return res.status(404).send({
        error: "ITEM_UNAVAILABLE",
        id
      });
    }

    // If we got the resource, select all of its images (can we improve this be one query?)
    const images = await sql`select content from images where resource_id = ${id};`;

    res.send({ ...resource, images: images.map(i => i.content) });
  } catch (error) {
    console.error(error);

    res.send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
});

// POST /api/item/reserve/:id endpoint
app.post('/api/item/reserve/:id', async (req, res) => {

  // Parse query and URL parameters
  const id = parseInt(req.params.id);
  const user_id = parseInt(req.query.user_id);
  if (isNaN(id) || isNaN(user_id)) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "please provide a numeric user ID and item ID"
    });
  }

  try {
    // Get the item, but only if it currently belongs to someone
    const items = await sql`
      select owned_by
      from resources
      where id = ${id} and reserved_by IS NOT NULL;`;

    // If we get rows back, the item is already reserved
    if (items.length > 0) {
      return res.status(409).send({
        error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
        id
      });
    }

    // If we got no rows back, update the item to be reserved by `user_id`
    const result = await sql`update resources 
      set reserved_by = ${user_id} where id = ${id}`;

    res.status(200).send({
      ok: API_RETURN_MESSAGES.RESERVE_SUCCESS,
      id
    });
  } catch (error) {
    console.error(error);

    res.send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
});

// POST /api/item/confirm-reservation/:id endpoint
app.post('/api/item/confirm-reservation/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.query;
  res.send();
});

// POST /api/item/cancel-reservation/:id endpoint
app.post('/api/item/cancel-reservation/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id, relist } = req.query;
  res.send();
});

// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});
