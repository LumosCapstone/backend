import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import * as dotenv from 'dotenv';
import express from 'express';
import postgres from 'postgres';
import jwt from 'jsonwebtoken'

const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')

dotenv.config();

const app = express();
const port = 3000;
app.use(express.json())

// Route imports
const itemRoute = require('./api/item');
const reserveRoute = require('./api/reservation');
const confirmRoute = require('./api/confirm-reservation');
const cancelRoute = require('./api/cancel-reservation');
const returnRoute = require('./api/return');
const listingRoute = require('./api/listing');
const userRoute = require('./api/user');

const sql = postgres({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
});

import { RESOURCE_TYPES, API_RETURN_MESSAGES, ITEM } from './api/constants.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

// GET /api/item endpoint & /api/item/:id endpoint
app.use('/api/item', itemRoute);

// POST /api/item/reserve/:id endpoint
app.use('/api/item', reserveRoute);

// POST /api/item/confirm-reservation/:id endpoint
app.use('/api/item/', confirmRoute);

// POST /api/item/cancel-reservation/:id endpoint
app.use('/api/item', cancelRoute);

// POST /api/item/return/:id endpoint
app.use('/api/item', returnRoute);

// POST /api/item/listing/:id endpoint
app.use('/api/item', listingRoute);

// GET /api/user/:id endpoint
app.use('/api', userRoute);

app.post('/listing/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const user_id = parseInt(req.query.user_id);
  const item_listing = req.query.item_listing;
  let status;

  if (isNaN(id) || isNaN(user_id) || !item_listing) {
    res.status(400).send({
      error: "BAD_REQUEST",
      message: "Please provide a numeric ID, user ID, and all query parameters (user_id, item_listing)"
    });
  }

  status = (item_listing === 'true');

  try {
    // select resource
    const [resource] = await sql`
      select owned_by, reservation_status 
      from resources
      where id = ${id} 
    `;

    // No resource found
    if (!resource) {
      return res.status(404).send({
        error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
        id
      });
    } else if (resource.owned_by != user_id) { // user relisting the item must be its owner
      return res.status(401).send({
        error: API_RETURN_MESSAGES.UNAUTHORIZED,
        message: "You are not authorized to perform this action"
      });
    } else if (resource.reservation_status != ITEM.LISTED && resource.reservation_status != ITEM.UNLISTED) { // the item cannot be reserved
      return res.status(403).send({
        error: API_RETURN_MESSAGES.RESERVED,
        message: "Cannot alter the listing of an item that is currently reserved"
      });
    }

    // update resource
    const update_item_listing = await sql`
      update resources
      set reservation_status = ${(status ? ITEM.LISTED : ITEM.UNLISTED)}
      where id = ${id}
    `;

    if (status) {
      return res.status(200).send({
        ok: API_RETURN_MESSAGES.RELISTED,
        id
      });

    } else {
      return res.status(200).send({
        ok: API_RETURN_MESSAGES.UNLISTED,
        id
      });
    }
  }
  catch (error) {
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


app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email == undefined || password == undefined) {
      return res.status(400).send({
        error: "All_PARAMETER_REQUIRED"
      });
    }

    const rows = await sql`SELECT * FROM users where email = ${email};`

    if (rows.length === 0) {
      return res.status(401).json({ error: 'INVALID_EMAIL_OR_PASSWORD' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'INVALID_EMAIL_OR_PASSWORD' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
    return res.status(200).json({ token, id: user.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});


// register new user
app.post('/api/register', async (req, res) => {
  var { name, email, phone_number, password } = req.body;

  if (!email || !name || !password) {
    res.status(400).json({ error: 'All_FIELDS_ARE_REQUIRED' });
    return;
  }

  if (phone_number && phone_number.length != 10) {
    res.status(400).json({ error: 'INVALID_PHONE_NUMBER' });
    return;
  } else if (phone_number == undefined) {
    phone_number = ""
  }

  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'INVALID_EMAIL' });
    return;
  }

  try {
    const existingUser = await sql`
      SELECT * FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (existingUser.length > 0) {
      res.status(400).json({
        "error": "EMAIL_ALREADY_REGISTERED",
        "email": email
      })
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO users (name,email,password_hash, phone_number)
      VALUES (${name}, ${email}, ${hashedPassword}, ${phone_number})
    `;

    res.status(200).json({
      ok: "REGISTERED_SUCCESFULLY"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" })
  }
});


// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});
