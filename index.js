import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import * as dotenv from 'dotenv';
import express from 'express';
import sql from './api/sql-postgres';

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

const bcrypt = require('bcrypt')

dotenv.config();

const app = express();
const port = 3000;
app.use(express.json())

app.get('/', async (req, res) => {
  const [{ '?column?': one }] = await sql`select 1;`;
  res.send(`Hello World! Here's a number from Postgres: ${one}`);
});

// GET /api/item endpoint & /api/item/:id endpoint
app.get('/api/item',(req,res) =>  item_list(req,res,sql));

// GET /api/item/:id endpoint
app.get('/api/item/:id', (req,res) => item_view(req,res,sql));

// POST /api/item/reserve/:id endpoint
app.post('/reserve/:id', (req,res) => reserveRoute(req,res,sql));

// POST /api/item/confirm-reservation/:id endpoint
app.post('/api/item/confirm-reservation/:id', (req,res) => confirmRoute(req,res,sql));

// POST /api/item/cancel-reservation/:id endpoint
app.post('/api/item/cancel-reservation/:id', (req,res) => cancelRoute(req,res,sql));

// POST /api/item/return/:id endpoint
app.post('/api/item/return/:id', (req,res) => returnRoute(req,res,sql));

// POST /api/item/listing/:id endpoint
app.post('/api/item/listing/:id', (req,res) => listingRoute(req,res,sql));

// GET /api/user/:id endpoint
app.get('/api/user/:id', (req,res) => userRoute(req,res,sql));

// POST /api/login endpoint
app.post('/api/login', (req,res) => loginRoute(req,res,sql));

// POST /api/register endpoint
app.post('/api/register', (req,res) => registerRoute(req,res,sql));

// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});