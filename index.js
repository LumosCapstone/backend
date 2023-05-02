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
const loginRoute = require('./api/login');
const registerRoute = require('./api/register');

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

// POST /api/login endpoint
app.use('/api', loginRoute);

// POST /api/register endpoint
app.use('/api', registerRoute);

// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});