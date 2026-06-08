import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@placeholder/placeholder');
export default sql;
