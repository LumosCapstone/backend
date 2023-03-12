import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import * as dotenv from 'dotenv';
import express from 'express';
import postgres from 'postgres';

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

import { RESOURCE_TYPES, API_RETURN_MESSAGES } from './js/constants.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

app.post('/api/register', async (req, res) =>{
const {name, email, phone_number, password} = req.body;


if (email == "" || name == "" || phone_number == "" || password == ""){
  res.status(400).send('All parameters required');
  return;
}

if (!emailRegex.test(email)) {
  res.status(400).send('Invalid email format');
  return;
}

try {
  const existingUser = await sql`
    SELECT * FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  if (existingUser.length > 0) {
    res.status(400).send('User already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await sql`
    INSERT INTO users (name,email,password_hash, phone_number)
    VALUES (${name}, ${email}, ${hashedPassword}, ${phone_number})
  `;
  res.sendStatus(201);
} catch (err) {
  console.error(err);
  res.status(500).send('Server error');
}

})

// register new user
app.post('/api/register', async (req, res) => {
  const { name, email, phone_number, password } = req.body;

  if (email == "" || name == "" || phone_number == "" || password == "") {
    res.status(400).send('All fields are required');
    return;
  }

  if (phone_number.length != 10) {
    res.status(400).send('Invalid phone number');
    return;
  }

  if (!emailRegex.test(email)) {
    res.status(400).send('Invalid email');
    return;
  }

  try {
    const existingUser = await sql`
      SELECT * FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (existingUser.length > 0) {
      res.status(400).send('Email already registered');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO users (name,email,password_hash, phone_number)
      VALUES (${name}, ${email}, ${hashedPassword}, ${phone_number})
    `;

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});


// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});