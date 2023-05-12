import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = postgres({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
});

export default sql;