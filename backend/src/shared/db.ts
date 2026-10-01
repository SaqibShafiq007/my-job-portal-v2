import { Pool } from 'pg';
import { config } from './config';   

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  application_name: 'job-portal',
});

const db = { query: pool.query.bind(pool) };
export default db;