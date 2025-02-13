const { Pool, Client } = require("pg");
const express = require("express");
const fs = require("fs");
const fss = require("fs").promises;
const base64Img = require("base64-img");
const path = require("path");
const cors = require("cors");
const Joi = require("joi"); // for input validation
const https = require("https");
////////////////////////
const crypto = require("crypto");
const { Cashfree } = require("cashfree-pg");

require("dotenv").config();
////////////////////////////////
const app = express();

// ????????????????????????????????????????????????????????
const axios = require("axios");
const WebSocket = require("ws"); // Import the WebSocket library
var base64String_data = "";
// ????????????????????????????????????????????????????????
let latestWaitTime = null; // Variable to store the latest waitTime
var sseClients = []; // Array to store all connected SSE clients

// Catch uncaught exceptions globally and log them
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Optionally, you can restart your application here
  process.exit(1); // Exit the process to allow a restart, if necessary
});

app.use(
  cors({
    origin: "*", // Replace with your frontend's actual URL
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// app.use(cors(corsOptions));

app.use(express.json({ limit: "300mb" }));
/////////////////////////
app.use(
  express.urlencoded({
    limit: "300mb",
    extended: true,
  })
);

Cashfree.XClientId = process.env.CLIENT_ID;
Cashfree.XClientSecret = process.env.CLIENT_SECRET;
// Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;
Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;

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
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE, // Now switch to `webapp` database
    password: process.env.PASSWORD,
    port: process.env.PORT,
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

  app.post("/api/payment", async (req, res) => {
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

      // Process payment order with Cashfree
      const response = await Cashfree.PGCreateOrder("2023-08-01", request);
      console.log(response.data);
      res.json(response.data); // Send Cashfree response back to the client
    } catch (error) {
      console.error("Error processing payment:", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  });

  app.post("/api/verify", async (req, res) => {
    console.log("verify request received");
    console.log("data", req.body);
    let { orderId } = req.body;

    try {
      const response = await Cashfree.PGOrderFetchPayments(
        "2023-08-01",
        orderId
      );
      console.log("??????????????????????????????***************************");
      console.log(
        "Payment verification response:",
        response.data[0].payment_status
      );
      console.log("??????????????????????????????***************************");
      // Send payment verification response back to the client
      if (response.data[0].payment_status) {
        let paymentSuccess = response.data[0].payment_status;
        res.json(paymentSuccess);
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  });

  // Define the image directory
  const imageDir = path.join(__dirname, "images");
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir);
  }

  // Define the image directory
  const imageDir2 = path.join(__dirname, "screenshoots");
  if (!fs.existsSync(imageDir2)) {
    fs.mkdirSync(imageDir2);
  }

  // API endpoint for registration
  app.post("/api/addDataInDatabase", async (req, res) => {
    console.log("addDataInDatabase request received");
    let value = req.body;

    try {
      const {
        order_amount,
        customer_phone,
        customer_name,
        customer_email,
        base64String,
      } = value;

      if (!base64String) {
        return res.status(400).json({ message: "Base64 string is required." });
      }

      const now = new Date();
      const dateString = now.toISOString().replace(/:/g, "-");
      const fileName = `${customer_name}_${dateString}`;
      const imagePath = base64Img.imgSync(base64String, imageDir, fileName);

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

      const result = await pool.query(query, values);
      const newUser = result.rows[0];

      // Prepare image data to send via WebSocket
      const imageData = {
        customer_name: newUser.customer_name,
        customer_email: newUser.customer_email,
        base64String: base64String, // Base64 string for the image
      };

      // Send image data to all WebSocket clients
      // sendToWebSocketClients(imageData);

      // Send success response
      res
        .status(201)
        .json({ message: "User added successfully", user: newUser });
    } catch (error) {
      console.error("Error adding data to database:", error);
      res
        .status(500)
        .json({ message: "An error occurred", error: error.message });
    }
  });

  app.post("/api/upload", (req, res) => {
    const { screenshot, customer_name } = req.body;

    console.log("Received screenshot for customer:", customer_name);

    // Directory where images will be saved
    const imageDir2 = "./screenshoots"; // Make sure this folder exists or create it

    // Create the image directory if it doesn't exist
    if (!fs.existsSync(imageDir2)) {
      fs.mkdirSync(imageDir2, { recursive: true });
    }

    // Get current date and time for the filename
    const now = new Date();
    const dateString = now.toISOString().replace(/:/g, "-"); // Format date to avoid colons in filenames
    const fileName = `${customer_name}_${dateString}`; // Create filename with customer name and date
    const imagePath = path.join(imageDir, fileName); // Full path for the image

    try {
      // Save the image synchronously using the generated filename
      base64Img.imgSync(screenshot, imageDir2, fileName);

      res.json({
        status: "success",
        message: "Screenshot received",
        path: imagePath,
      });
    } catch (error) {
      console.error("Error saving image:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to save screenshot" });
    }
  });

  // Define the folder where your media files are stored
  // const mediaFolderPath = path.join('C:/web'); // local
  const mediaFolderPath = path.join(__dirname, "video"); // This will be /home/eyelike/node-backend/images

  // Endpoint to serve a random media file
  app.get("/api/media/:filename", (req, res) => {
    console.log("media request get");
    const filename = req.params.filename;
    const filePath = path.join(mediaFolderPath, filename);

    // Check if the file exists before serving it
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "video/mp4"); // Set content type for video
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  // Endpoint to get the latest item
  app.get("/api/items", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM users ORDER BY id DESC LIMIT 1"
      );

      if (result.rows.length > 0) {
        const item = result.rows[0]; // Get the latest item
        const imagePath = item.image_path;

        try {
          // Read the image file and convert it to base64
          const imageData = await fss.readFile(imagePath, "base64"); // No callback here

          // Add base64 string to the item object
          item.image_base64 = `data:image/png;base64,${imageData}`; // Prefix with MIME type
        } catch (fileError) {
          console.error("Error reading image file:", fileError);
          item.image_base64 = null; // Set to null if reading fails
        }

        // Send the updated item as the response
        res.json(item);
      } else {
        res.status(404).json({ error: "No items found" });
      }
    } catch (err) {
      console.error("Error fetching item:", err);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.post("/api/test", (req, res) => {
    console.log("test request received:", req.body);
    res.status(200).json({ message: "test sucess" });
  });

  const options = {
    key: fs.readFileSync(
      "/etc/letsencrypt/live/selfi.eyelikesystems.com/privkey.pem"
    ),
    cert: fs.readFileSync(
      "/etc/letsencrypt/live/selfi.eyelikesystems.com/fullchain.pem"
    ),
    ca: fs.readFileSync(
      "/etc/letsencrypt/live/selfi.eyelikesystems.com/chain.pem"
    ),
  };

  https.createServer(options, app).listen(8080, "0.0.0.0", () => {
    console.log("Server running on https://localhost:8080");
  });
});
