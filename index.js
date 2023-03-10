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

app.get('/', async (req, res) => {
  const [{ '?column?': one }] = await sql`select 1;`;
  res.send(`Hello World! Here's a number from Postgres: ${one}`);
});

// GET /api/item endpoint
app.get('/api/item', (req, res) => {
  res.send();
});
// GET /api/item/:id endpoint
app.get('/api/item/:id', (req, res) => {
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