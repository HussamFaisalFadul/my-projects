import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => {
  console.log('✅ متصل بقاعدة البيانات PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ خطأ في قاعدة البيانات:', err.message);
});

export default pool;
