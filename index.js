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

  // TODO: join users
  const resources = await sql`
    select id, type, name, quantity, ST_AsText(location) as location_point
    from resources
    where ST_DWithin(
      'SRID=4326;POINT(${long} ${lat})'::geography,
      resources.location::geography,
      ${max_distance * metersPerMile}
    );`;
  
  // const images = await sql`(fetch one image of each resource)`;
  
  // Loop through resources:
  //   get the distance between (lat, long), and the resources'
  //   `location_point` for the `distance` field in the response


  res.send();
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
    select id, type, name, quantity, ST_AsText(location) as location_point
    from resources
    where id = ${id};`;

  // Get the distance between (lat, long), and the resource's
  // `location_point` for the `distance` field in the response

  res.send();
});

// POST /api/item/reserve/:id endpoint
app.post('/api/item/reserve/:id', (req, res) => {
  res.send();
});

// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});
