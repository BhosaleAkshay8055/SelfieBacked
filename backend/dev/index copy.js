const { Pool, Client } = require('pg');
const express = require('express');
const fs = require('fs');
const base64Img = require('base64-img');
const path = require('path');
const cors = require('cors');

const app = express();

const corsOptions = {
    origin: 'http://localhost:3001',
    optionsSuccessStatus: 200
  };
app.use(cors(corsOptions));

app.use(express.json());

  

const defaultClient = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Connect to the default "postgres" database
  password: '1234',
  port: 5432,
});

// Create database function
const createDatabase = async () => {
  try {
    await defaultClient.connect();
    const res = await defaultClient.query("SELECT 1 FROM pg_database WHERE datname = 'webapp'");
    if (res.rowCount === 0) {
      await defaultClient.query('CREATE DATABASE webapp');
      console.log('Database "webapp" created');
    } else {
      console.log('Database "webapp" already exists');
    }
  } catch (err) {
    console.error('Error creating/checking database:', err);
  } finally {
    await defaultClient.end();
  }
};

// After database creation, connect to `webapp`
const connectToWebappDB = () => {
  return new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'webapp', // Now switch to `webapp` database
    password: '1234',
    port: 5432,
  });
};

// Call the function to ensure the database exists, then start server
createDatabase().then(() => {
  const pool = connectToWebappDB();

  // Create table if it doesn't exist
  const createTable = async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          mobile_no VARCHAR(15),
          message TEXT,
          image_path TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Table "users" created or already exists');
    } catch (err) {
      console.error('Error creating table:', err);
    }
  };

  createTable();

  // Define the image directory
  const imageDir = path.join(__dirname, 'images');
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir);
  }

  // API endpoint for registration
  app.post('/register', async (req, res) => {
    console.log('111111111111111111111')
    const { name, mobile_no, message, base64String } = req.body;

    if (!name || !mobile_no || !message || !base64String) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    try {

        
      // Save image from base64 string
      const imagePath = base64Img.imgSync(base64String, imageDir, `img_${Date.now()}`);

      // Insert user into the database
      const query = `
        INSERT INTO users (name, mobile_no, message, image_path)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const values = [name, mobile_no, message, imagePath];

      const result = await pool.query(query, values);
      const newUser = result.rows[0];

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: newUser,
      });
    } catch (err) {
      console.error('Error inserting user:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Handle unknown routes
  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  // Start the server
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
