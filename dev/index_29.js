// const { Pool, Client } = require("pg");
const express = require("express");
const fs = require("fs");
const base64Img = require("base64-img");
const path = require("path");
const cors = require("cors");
const Joi = require("joi"); // for input validation
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
const WS_PORT = 8080; // Port for WebSocket server

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

// ---------------------------- WebSocket setup --------------------------------------------- //

// Set up WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });


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
  customer_phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required(), // must be a string of exactly 10 digits
  customer_name: Joi.string().min(3).max(30).required(), // customer name should be between 3-30 characters
  customer_email: Joi.string().email().required(), // must be a valid email format
  // base64String: Joi.string().base64().required(), // must be a valid base64 string
});

// ???????????????????????????????????????????????????????????????????????????????????????????????????????
// API endpoint for registration
app.post("/addDataInDatabase", async (req, res) => {
  console.log("addDataInDatabase request received");
  // Validate request body against the schema
  const { error, value } = schema.validate(req.body);

 
    var {
      order_amount,
      customer_phone,
      customer_name,
      customer_email,
      base64String,
    } = value;

 
    base64String_data = base64String
   

    // Ensure base64String is present
    if (!base64String) {
      return res.status(400).json({ message: "Base64 string is required." });
    }


    const imageData = {
      customer_name: customer_name,
      // customer_phone: newUser.customer_phone,
      customer_email: customer_email,
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
