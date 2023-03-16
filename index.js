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



// register new user
app.post('/api/register', async (req, res) => {
  var { name, email, phone_number, password } = req.body;

  if (email == "" || name == "" || password == "") {
    res.status(400).send('All fields are required');
    return;
  }

  if (phone_number != undefined && phone_number != "" && phone_number.length != 10 ) {
    res.status(400).json({error: 'Invalid phone number'});
    return;
  }else if(phone_number == undefined){
    phone_number = ""
  }

  if (!emailRegex.test(email)) {
    res.status(400).json({error: 'Invalid email'});
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
        "email": "email@example.com"
      })
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
    res.status(500).json({error: "Internal_Server_Error"})
  }
});


// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});