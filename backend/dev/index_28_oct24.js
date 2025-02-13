const { Pool, Client } = require("pg");
const express = require("express");
const fs = require("fs");
const base64Img = require("base64-img");
const path = require("path");
const cors = require("cors");
const Joi = require('joi'); // for input validation
////////////////////////
const crypto = require("crypto");
const { Cashfree } = require("cashfree-pg");

require("dotenv").config();
////////////////////////////////
const app = express();


// ????????????????????????????????????????????????????????
const axios = require("axios");
const WebSocket = require("ws"); // Import the WebSocket library
var base64String_data = ""
// ????????????????????????????????????????????????????????
let latestWaitTime = null; // Variable to store the latest waitTime
var sseClients = []; // Array to store all connected SSE clients

const corsOptions = {
  // origin: 'http://localhost:3001',
  // methods: ['GET', 'POST'],
  // allowedHeaders: ['Content-Type'],
  origin: "*",
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

  // ---------------------------- WebSocket setup --------------------------------------------- //

  const wss = new WebSocket.Server({ port: 3003 }); // Create a WebSocket server
 

  wss.on("connection", (ws) => {
    console.log("Frontend connected via WebSocket");
  
    ws.on("message", (message) => {
      const receivedMessage = JSON.parse(message);
      console.log('Received message:', receivedMessage);
      
      if (receivedMessage.waitTime !== undefined) {
        latestWaitTime = receivedMessage.waitTime;
        console.log('Updated latestWaitTime:', latestWaitTime);
  
        // Push the updated waitTime to SSE clients
        sendSSEUpdate(latestWaitTime);
      }
    });
  
    ws.on("close", () => {
      console.log("Frontend disconnected");
    });
  });
  


// SSE endpoint
app.get('/waittime', (req, res) => {
  console.log('New SSE client connected');
  
  // Set the headers for the SSE connection
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial data immediately, replacing waitTime with latestWaitTime
  res.write(`data: ${JSON.stringify({ waitTime: latestWaitTime || 0 })}\n\n`);

  // Add the connected client to sseClients
  sseClients.push(res);

  // Function to periodically send updated waitTime
  const interval = setInterval(() => {
    if (latestWaitTime > 0) {
      latestWaitTime -= 1000; // Decrease waitTime every second as an example
      res.write(`data: ${JSON.stringify({ waitTime: latestWaitTime })}\n\n`);
    }

    // Stop streaming when latestWaitTime reaches 0
    if (latestWaitTime <= 0) {
      clearInterval(interval);
      res.write('data: {"waitTime": 0}\n\n');
      res.end();
      sseClients = sseClients.filter(client => client !== res); // Remove client after closing
    }
  }, 1000);

  // Clean up when connection is closed
  req.on('close', () => {
    clearInterval(interval);
    sseClients = sseClients.filter(client => client !== res); // Remove disconnected client
    res.end();
  });
});


function sendSSEUpdate(data) {
  console.log('Sending SSE update to all clients');
  console.log('sseClients array:', sseClients);

  sseClients.forEach((client) => {
    client.write(`data: ${JSON.stringify({ waitTime: data })}\n\n`);
  });
}



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

  // ???????????????????????????????????????????????????????????????????????????????????????????????
    // Define the image directory
    const imageDir2 = path.join(__dirname, "screenshoots");
    if (!fs.existsSync(imageDir2)) {
      fs.mkdirSync(imageDir2);
    }
  // ???????????????????????????????????????????????????????????????????????????????????????????????
  // Define the input validation schema
  const schema = Joi.object({
    order_amount: Joi.number().positive().required(), // must be a positive number
    customer_phone: Joi.string().pattern(/^[0-9]{10}$/).required(), // must be a string of exactly 10 digits
    customer_name: Joi.string().min(3).max(30).required(), // customer name should be between 3-30 characters
    customer_email: Joi.string().email().required(), // must be a valid email format
    // base64String: Joi.string().base64().required(), // must be a valid base64 string
  });

  // API endpoint for registration
  app.post("/addDataInDatabase", async (req, res) => {
    console.log("addDataInDatabase request received");
    // Validate request body against the schema
    const { error, value } = schema.validate(req.body);

    // If validation fails, return a 400 Bad Request with the validation error message
    // if (error) {
    //   console.log('error 233232323232')
    //   return res.status(400).json({ message: error.details[0].message });
    // }


    try {
      // Destructure the validated request body
      var {
        order_amount,
        customer_phone,
        customer_name,
        customer_email,
        base64String,
      } = value;

      // console.log(
      //   order_amount,
      //   customer_phone,
      //   customer_name,
      //   customer_email,
      //   )

      base64String_data = base64String


      // if (Array.isArray(customer_phone) && customer_phone.length > 0) {
      //   customer_phone = customer_phone[0]; // Now customer_phone is a string
      // }

      // Ensure base64String is present
      if (!base64String) {
        return res.status(400).json({ message: "Base64 string is required." });
      }


      const now = new Date();
      const dateString = now.toISOString().replace(/:/g, '-'); // Format date to avoid colons in filenames
      const fileName = `${customer_name}_${dateString}`; // Create filename with customer name and date

      // Save the image and get the path
      const imagePath = base64Img.imgSync(
        base64String,
        imageDir,
        fileName
      );
      // customer_phone = customer_phone[0];
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

      // ??????????????????????????????????????????????????????????????????????????????????????????????????????????
      // After successful database insertion, send the base64 image to another frontend application
      // After successful database insertion, send the image data to the WebSocket

      const imageData = {
        customer_name: newUser.customer_name,
        // customer_phone: newUser.customer_phone,
        customer_email: newUser.customer_email,
        // order_amount: newUser.order_amount,
        base64String: base64String_data, // Convert image to base64 for sending
      };

      // Broadcast the image data to all connected WebSocket clients
      wss.clients.forEach((client) => {
        console.log('sent image to dashboard')
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(imageData));
        }
      });
      // ??????????????????????????????????????????????????????????????????????????????????????????????????????????

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


  // ???????????????????????????????????????????????????????????????????????????????????????????????????????

app.post('/upload', (req, res) => {
  const { screenshot, customer_name } = req.body;

  console.log("Received screenshot for customer:", customer_name);

  // Directory where images will be saved
  const imageDir2 = './screenshoots'; // Make sure this folder exists or create it

  // Create the image directory if it doesn't exist
  if (!fs.existsSync(imageDir2)) {
    fs.mkdirSync(imageDir2, { recursive: true });
  }

  // Get current date and time for the filename
  const now = new Date();
  const dateString = now.toISOString().replace(/:/g, '-'); // Format date to avoid colons in filenames
  const fileName = `${customer_name}_${dateString}`; // Create filename with customer name and date
  const imagePath = path.join(imageDir, fileName); // Full path for the image

  try {
    // Save the image synchronously using the generated filename
    base64Img.imgSync(screenshot, imageDir2, fileName);

    res.json({ status: 'success', message: 'Screenshot received', path: imagePath });
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({ status: 'error', message: 'Failed to save screenshot' });
  }
});

  
  
  
  // ???????????????????????????????????????????????????????????????????????????????????????????????????????

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
