require("dotenv").config();

const mysql = require("mysql2/promise");

if (
  !process.env.DB_HOST ||
  !process.env.DB_USER ||
  !process.env.DB_PASSWORD ||
  !process.env.DB_NAME
) {
  throw new Error("Database environment variables are missing.");
}

if (!process.env.DB_SSL_CA) {
  throw new Error("DB_SSL_CA environment variable is missing.");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n"),
    minVersion: "TLSv1.2",
    rejectUnauthorized: true
  },

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

module.exports = pool;
