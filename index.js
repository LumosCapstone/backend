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

import { RESOURCE_TYPES, API_RETURN_MESSAGES } from './js/constants.js';

const metersPerMile = 1609.34;

// Gives the distance in meters between the given PostGIS point and selected resources.
// Example of point_sql: `POINT(-121.2352251 85.22345752)`
const distance_sql = (pointSql) => sql`ST_DistanceSpheroid(
  ST_GeomFromText(${pointSql}, 4326), 
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

  if (max_distance < 1) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "max_distance cannot be less than 1"
    });
  }

  const point = `POINT(${long} ${lat})`;
  const resources = await sql`
    select resources.id, type, resources.name, quantity, ST_AsText(location) as location_point, users.name as owner_name, users.id as owner_id, ST_DistanceSpheroid(
        ST_GeomFromText(${point}, 4326), 
        resources.location, 
        'SPHEROID["WGS 84",6378137,298.257223563]'
      ) as distance_meters
    from resources left outer join users on users.id in (owned_by, reserved_by) where ST_DWithin(
      ST_GeomFromText(${point}, 4326),
      resources.location::geography,
      ${max_distance * metersPerMile}
    )
    `.catch(reason => console.error(reason));

  // const images = await sql`(fetch one image of each resource)`;

  res.send(resources);
});

// GET /api/item/:id endpoint
app.get('/api/item/:id', async (req, res) => {
  const id = req.params.id;
  if (typeof id != 'number') {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "please provide a numeric item ID"
    });
  }

  // TODO: join users and images
  const resources = await sql`
    select id, type, name, quantity, ST_AsText(location) as location_point, ${distance_sql(`location`)}
    from resources
    where id = ${id};`;

  // Get the distance between (lat, long), and the resource's
  // `location_point` for the `distance` field in the response

  res.send();
});

// POST /api/item/reserve/:id endpoint
app.post('/api/item/reserve/:id', async (req, res) => {

  const { id } = req.params.id;
  const { user_id } = req.query.user_id;

  if (typeof user_id != 'number' || typeof id != 'number') {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "please provide a numeric user ID and item ID"
    });
  }

  // Get the item, but only if it currently belongs to someone
  const items = await sql`select belongs_to
    from resources
    where id = ${id} and belongs_to IS NOT NULL;`;

  // If we get rows back, the item is already reserved
  if (items.length > 0) {
    return res.status(409).send({
      error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
      id
    });
  }

  const result = await sql`update resources 
    set belongs_to = ${user_id} where id = ${id}`;

  res.status(200).send({
    ok: API_RETURN_MESSAGES.RESERVE_SUCCESS,
    id
  });
});

// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});
