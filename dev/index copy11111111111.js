const { Pool, Client } = require("pg");
const express = require("express");
const fs = require("fs");
const base64Img = require("base64-img");
const path = require("path");
const cors = require("cors");
////////////////////////
const crypto = require("crypto");
const { Cashfree } = require("cashfree-pg");

require("dotenv").config();
////////////////////////////////
const app = express();

const corsOptions = {
  origin: 'http://localhost:3001',
  // origin: "*",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: "100mb" }));
/////////////////////////
app.use(
  express.urlencoded({
    limit: "100mb",
    extended: true,
  })
);

Cashfree.XClientId = process.env.CLIENT_ID;
Cashfree.XClientSecret = process.env.CLIENT_SECRET;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;
// Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;

// ---------------------------- database start ---------------------------------------------

const defaultClient = new Client({
  user: "postgres",
  host: "localhost",
  database: "postgres", // Connect to the default "postgres" database
  password: "1234",
  port: 5432,
});

// Create database function
const createDatabase = async () => {
  try {
    await defaultClient.connect();
    const res = await defaultClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'webapp'"
    );
    if (res.rowCount === 0) {
      await defaultClient.query("CREATE DATABASE webapp");
      console.log('Database "webapp" created');
    } else {
      console.log('Database "webapp" already exists');
    }
  } catch (err) {
    console.error("Error creating/checking database:", err);
  } finally {
    await defaultClient.end();
  }
};

// After database creation, connect to `webapp`
const connectToWebappDB = () => {
  return new Pool({
    user: "postgres",
    host: "localhost",
    database: "webapp", // Now switch to `webapp` database
    password: "1234",
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
          customer_name VARCHAR(100),
          customer_phone VARCHAR(15),
          customer_email TEXT,
          image_path TEXT,
          order_amount TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Table "users" created or already exists');
    } catch (err) {
      console.error("Error creating table:", err);
    }
  };

  createTable();

  // ---------------------------- database end ---------------------------------------------

  function generateOrderId() {
    const uniqueId = crypto.randomBytes(16).toString("hex");

    const hash = crypto.createHash("sha256");
    hash.update(uniqueId);

    const orderId = hash.digest("hex");

    return orderId.substr(0, 12);
  }

  app.post("/payment", async (req, res) => {
    console.log("payment request received");
    let {
      order_amount,
      customer_phone,
      customer_name,
      customer_email,
      base64String,
    } = req.body;
    customer_phone = String(customer_phone);
    try {
      let request = {
        order_amount: order_amount,
        order_currency: "INR",
        order_id: await generateOrderId(),
        customer_details: {
          customer_id: "123456",
          customer_phone: customer_phone,
          customer_name: customer_name,
          customer_email: customer_email,
        },
      };

      // const imagePath = base64Img.imgSync(
      //   base64String,
      //   imageDir,
      //   `img_${Date.now()}`
      // );

      // const query = `
      //   INSERT INTO users (customer_name, customer_phone, customer_email, image_path, order_amount)
      //   VALUES ($1, $2, $3, $4, $5)
      //   RETURNING *;
      // `;
      // const values = [
      //   customer_name,
      //   customer_phone,
      //   customer_email,
      //   imagePath,
      //   order_amount,
      // ];

      // const result = await pool.query(query, values);
      // const newUser = result.rows[0];

      // console.log('44444444444: ', order_amount)
      Cashfree.PGCreateOrder("2023-08-01", request)
        .then((response) => {
          console.log(response.data);
          res.json(response.data);
        })
        .catch((error) => {
          console.error(error.response.data.message);
        });
    } catch (error) {
      console.log(error);
    }
  });

  app.post("/verify", async (req, res) => {
    console.log("verify request received");
    console.log("data", req.body);
    try {
      let { orderId } = req.body;

      Cashfree.PGOrderFetchPayments("2023-08-01", orderId)
        .then((response) => {
          console.log("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
          res.json(response.data);
          console.log("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
        })
        .catch((error) => {
          console.error(error.response.data.message);
        });
    } catch (error) {
      console.log(error);
    }
  });
  ///////////////////////////////////

  // Define the image directory
  const imageDir = path.join(__dirname, "images");
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir);
  }

  // API endpoint for registration
  app.post("/addDataInDatabase", async (req, res) => {
    console.log("addDataInDatabase request received");

    try {
      // Destructure the request body
      let {
        order_amount,
        customer_phone,
        customer_name,
        customer_email,
        base64String,
      } = req.body;

      if (Array.isArray(customer_phone) && customer_phone.length > 0) {
        customer_phone = customer_phone[0]; // Now customer_phone is a string '1212121212'
      }

      // Ensure base64String is present
      if (!base64String) {
        return res.status(400).json({ message: "Base64 string is required." });
      }

      // Save the image and get the path
      const imagePath = base64Img.imgSync(
        base64String,
        imageDir,
        `${customer_name}`
      );

      // Prepare the SQL query
      const query = `
            INSERT INTO users (customer_name, customer_phone, customer_email, image_path, order_amount)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
      const values = [
        customer_name,
        customer_phone,
        customer_email,
        imagePath,
        order_amount,
      ];

      // Execute the query
      const result = await pool.query(query, values);
      const newUser = result.rows[0];

      // Send a success response
      res
        .status(201)
        .json({ message: "User added successfully", user: newUser });
    } catch (error) {
      console.error("Error adding data to database:", error);
      // Send an error response
      res
        .status(500)
        .json({ message: "An error occurred", error: error.message });
    }
  });

  // Handle unknown routes
  app.use((req, res) => {
    res.status(404).send("Not Found");
  });

  // Start the server
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://192.168.1.60:${PORT}`);
  });
});
