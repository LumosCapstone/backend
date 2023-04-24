import * as dotenv from 'dotenv';
import express from 'express';
import postgres from 'postgres';
import bcrpyt from 'bcrypt'
import jwt from 'jsonwebtoken'
dotenv.config();

const app = express();
const port = 3000;
app.use(express.json())
const sql = postgres({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
});

import { RESOURCE_TYPES, API_RETURN_MESSAGES, ITEM } from './api/constants.js';

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
const resources_distance_sql = (point) => sql`ST_DistanceSpheroid(
  ST_GeomFromText(${point}, 4326), 
  resources.location, 
  'SPHEROID["WGS 84",6378137,298.257223563]'
) as distance_meters`;

// Returns true if a PostGIS point and selected resources geography are within a given distance.  
const resources_within_range_sql = (point, max_distance, type) => {
  let resource_rows;

  if (type) {
    resource_rows = sql`ST_DWithin(
      ST_GeomFromText(${point}, 4326),
      resources.location::geography,
      ${max_distance * metersPerMile})
      and type = ${type};`
  }
  else {
    resource_rows = sql`ST_DWithin(
      ST_GeomFromText(${point}, 4326),
      resources.location::geography,
      ${max_distance * metersPerMile});`
  }

  return resource_rows;
};

app.get('/', async (req, res) => {
  const [{ '?column?': one }] = await sql`select 1;`;
  res.send(`Hello World! Here's a number from Postgres: ${one}`);
});

// GET /api/item endpoint
app.get('/api/item', async (req, res) => {
  // Get query parameters
  const { type, lat, long, max_distance } = req.query;

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
       resources.id, resources.name, type, quantity, users.name as seller, content as image, 
       ${resources_distance_sql(point)}
     from resources 
     left outer join users on users.id = owned_by 
     left outer join images on resource_id = resources.id 
     where reservation_status = ${ITEM.LISTED} and
     ${resources_within_range_sql(point, max_distance, type)}`;

    // If rows are empty, items do not exist. 
    if (resources.length < 1) {
      return res.status(404).send({
        error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
      });
    }

    // Convert the resources' exact distance in meters to an approximation in miles
    for (let resource of resources) {
      resource.distance = metersToDistanceApproximation(resource.distance_meters);
      delete resource.distance_meters;
    }

    res.status(200).send(resources);
  } catch (error) {
    console.error(error);

    res.status(500).send({
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
        error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
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
    // Get the item, but only if it is currently reserved
    const items = await sql`
      select owned_by
      from resources
      where id = ${id} and reservation_status in (${ITEM.RESERVED}, ${ITEM.CONFIRMED});
    `;

    // If we get rows back, the item is already reserved
    if (items.length > 0) {
      return res.status(409).send({
        error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
        id
      });
    }

    // TODO: Could probably reduce this from 3 -> 2 queries by joining seller info on the resources select above.
    const [owner] = await sql`
      select name as seller, email as seller_email, phone_number as seller_phone 
      from users
      where id = ${user_id};
    `;

    if (!owner) {
      console.error(`Tried to reserve resource with unknown owner/user_id: ${user_id}`);

      return res.status(500).send({
        error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
        message: "Internal Server Error"
      });
    }

    // If we got no rows back, update the item to be reserved by `user_id`
    const _ = await sql`update resources 
      set reserved_by = ${user_id}, reservation_status = ${ITEM.RESERVED} where id = ${id}`;

    res.status(200).send({
      ok: API_RETURN_MESSAGES.RESERVE_SUCCESS,
      seller: owner.seller,
      seller_email: owner.seller_email,
      seller_phone: owner.seller_phone,
      id
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
});

// POST /api/item/confirm-reservation/:id endpoint
app.post('/api/item/confirm-reservation/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const user_id = parseInt(req.query.user_id);

  if (isNaN(id) || isNaN(user_id)) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "please provide a numeric user ID and item ID"
    });
  }

  try {
    // Select the resource whose reservation should be confirmed
    const [resource] = await sql`
      select id, owned_by, reservation_status
      from resources
      where id = ${id};
    `;

    if (!resource) { // No resource found
      return res.status(404).send({
        error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
        id
      });
    } else if (resource.owned_by != user_id) { // The user confirming the reservation has to be the owner
      return res.status(401).send({
        error: API_RETURN_MESSAGES.UNAUTHORIZED,
        message: "You are not authorized to perform this action."
      });
    } else if (resource.reservation_status != ITEM.RESERVED) { // The resource must have a reservation to confirm
      return res.status(403).send({
        error: API_RETURN_MESSAGES.NO_RESERVATION,
        message: "No reservation to confirm."
      });
    }

    const _update_result = await sql`
      update resources 
      set reservation_status = ${ITEM.CONFIRMED} where id = ${id};
    `;

    res.status(200).send({
      ok: API_RETURN_MESSAGES.RESERVE_CONFIRMATION_SUCCESS,
      id
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
});

// POST /api/item/cancel-reservation/:id endpoint
app.post('/api/item/cancel-reservation/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const user_id = parseInt(req.query.user_id);
  let relist = req.query.relist;

  if (isNaN(id) || isNaN(user_id)) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "please provide a numeric user ID and item ID"
    });
  }

  try {
    // Select the resource whose reservation should be cancelled
    const [resource] = await sql`
      select id, owned_by, reserved_by, reservation_status
      from resources
      where id = ${id};
    `;

    if (!resource) { // No resource found
      return res.status(404).send({
        error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
        id
      });
    } else if (![resource.owned_by, resource.reserved_by].includes(user_id)) { // The user cancelling the reservation has to be the owner or the reserver
      return res.status(401).send({
        error: API_RETURN_MESSAGES.UNAUTHORIZED,
        message: "You are not authorized to perform this action."
      });
    } else if (resource.reservation_status != ITEM.RESERVED && resource.reservation_status != ITEM.CONFIRMED) { // The resource must have an unconfirmed reservation to cancel
      return res.status(403).send({
        error: API_RETURN_MESSAGES.NO_RESERVATION,
        message: "No reservation to cancel."
      });
    }

    // `relist` query param defaults to false
    if (relist == undefined) relist = false;

    const _update_result = await sql`
      update resources 
      set reservation_status = ${relist ? ITEM.LISTED : ITEM.UNLISTED}, reserved_by = NULL where id = ${id};
    `;

    res.status(200).send({
      ok: API_RETURN_MESSAGES.RESERVE_CANCELLATION_SUCCESS,
      id
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
});

// POST /api/item/return/:id endpoint
app.post('/api/item/return/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const user_id = parseInt(req.query.user_id);

  if (isNaN(id) || isNaN(user_id)) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "please provide a numeric user ID and item ID"
    });
  }

  try {
    // Select the resource that should be returned
    const [resource] = await sql`
      select id, owned_by, reserved_by, reservation_status
      from resources
      where id = ${id};
    `;

    if (!resource) { // No resource found
      return res.status(404).send({
        error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
        id
      });
    } else if (resource.reservation_status != ITEM.CONFIRMED) { // The resource must be confirmed as borrowed
      return res.status(403).send({
        error: API_RETURN_MESSAGES.NOT_BORROWED,
        message: "Cannot return an item that hasn't been borrowed."
      });
    } else if (resource.reserved_by != user_id) { // The user cancelling the reservation has to be the borrower
      return res.status(401).send({
        error: API_RETURN_MESSAGES.UNAUTHORIZED,
        message: "You are not authorized to perform this action."
      });
    }

    const _update_result = await sql`
      update resources
      set reservation_status = ${ITEM.UNLISTED}, reserved_by = NULL where id = ${id};
    `;

    res.status(200).send({
      ok: API_RETURN_MESSAGES.RESOURCE_RETURNED,
      id
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
});

app.get('/api/user/:id', async (req, res) => {
  const user_id = parseInt(req.params.id);

  if (isNaN(user_id)) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "please provide a numeric user ID"
    });
  }

  try {
    // Fetch the user
    const [user] = await sql`
      select id, name, email, phone_number
      from users
      where id = ${user_id};
    `;

    // If `!user`, a user under the given ID doesn't exist
    if (!user) {
      return res.status(404).send({
        error: API_RETURN_MESSAGES.USER_NOT_FOUND,
        id: user_id
      });
    }

    res.status(200).send(user);

  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
});


app.post('/api/login', async(req, res)=>{
  try {
    const { email, password } = req.body;

    if (email == undefined || password == undefined){
        return res.status(400).send({
            error : "All parameters required"
        })
    }
    const query = 'SELECT * FROM users WHERE email = $1';
    const rows  = await sql `SELECT * FROM users where email = ${email};`

    if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const valid = await bcrpyt.compare(password, user.password_hash);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET,{
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
    return res.status(200).json({ token });
} catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
}
})
// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});
