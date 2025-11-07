const { Pool } = require('pg');
require('dotenv').config();

// Connect to postgres database first to create our target database
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // Connect to default postgres database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'system',
});

async function createDatabase() {
  try {
    const client = await pool.connect();
    
    // Check if database exists
    const checkResult = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      ['internship_aggregator']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Database "internship_aggregator" already exists');
    } else {
      // Create database
      await client.query('CREATE DATABASE internship_aggregator');
      console.log('✅ Database "internship_aggregator" created successfully');
    }
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Failed to create database:', error.message);
  }
}

createDatabase();