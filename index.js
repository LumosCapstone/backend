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

app.get('/', async (req, res) => {
  const [ {'?column?': one} ] = await sql`select 1;`;
  res.send(`Hello World! Here's a number from Postgres: ${one}`);
});

// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});