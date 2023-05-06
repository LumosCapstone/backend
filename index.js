import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import * as dotenv from 'dotenv';
import express from 'express';
import postgres from 'postgres';
import jwt from 'jsonwebtoken'

// Route imports
import { item_list, item_view } from './api/item.js';
import { reserveRoute } from './api/reservation.js';
import { confirmRoute } from './api/confirm-reservation.js';
import { cancelRoute } from './api/cancel-reservation.js';
import { returnRoute } from './api/return.js';
import { listingRoute } from './api/listing.js';
import { userRoute } from './api/user.js';
import { loginRoute } from './api/login.js';
import { registerRoute } from './api/register.js'

const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')

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
app.get('/api/item',(req,res) =>  item_list(req,res,sql));

// GET /api/item/:id endpoint
app.get('/api/item/:id', (req,res) => item_view(req,res,sql));

// POST /api/item/reserve/:id endpoint
app.post('/reserve/:id', (req,res,sql) => reserveRoute(req,res,sql));

// POST /api/item/confirm-reservation/:id endpoint
app.post('/api/item/confirm-reservation/:id', (req,res,sql) => confirmRoute(req,res,sql));

// POST /api/item/cancel-reservation/:id endpoint
app.post('/api/item/cancel-reservation/:id', (req,res,sql) => cancelRoute(req,res,sql));

// POST /api/item/return/:id endpoint
app.post('/api/item/return/:id', (req,res,sql) => returnRoute(req,res,sql));

// POST /api/item/listing/:id endpoint
app.post('/api/item/listing/:id', (req,res,sql) => listingRoute(req,res,sql));

// GET /api/user/:id endpoint
app.get('/api/user/:id', (req,res,sql) => userRoute(req,res,sql));

// POST /api/login endpoint
app.post('/api/login', (req,res,sql) => loginRoute(req,res,sql));

// POST /api/register endpoint
app.post('/api/register', (req,res,sql) => registerRoute(req,res,sql));

// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});