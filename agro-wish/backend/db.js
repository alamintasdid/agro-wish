/**
 * agroWish Backend - Database Connection Module
 * SE-331 Software Engineering Design Capstone Project
 * Member 2: Most Tasnim Jahan Rifa (ID: 241-35-116)
 * Lead: Backend and Data Engineering Lead
 * 
 * SRS Reference: Section 2.2, Section 7.4 (ERD), NFR-04 (Security)
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Ensure .env is explicitly loaded
dotenv.config({ path: path.join(__dirname, '.env') });

// Create a resilient MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agrowish_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

/**
 * Automatically tests connection on server boot and logs status
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 + 1 AS health');
    connection.release();
    console.log(`[Database] Connected successfully to MySQL database "${process.env.DB_NAME || 'agrowish_db'}" at ${process.env.DB_HOST || 'localhost'}.`);
    return true;
  } catch (err) {
    console.error(`[Database Error] Failed to connect to MySQL database "${process.env.DB_NAME || 'agrowish_db'}":`, err.message);
    console.warn(`[Database Hint] Ensure MySQL server is running on ${process.env.DB_HOST || 'localhost'} and the database schema in "database/schema.sql" has been executed.`);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
