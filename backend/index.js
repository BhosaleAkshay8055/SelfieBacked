const { Pool, Client } = require("pg");
const express = require("express");
const fs = require("fs");
const fss = require("fs").promises;
const base64Img = require("base64-img");
const path = require("path");
const cors = require("cors");
const Joi = require("joi"); // for input validation
const http = require("http");
////////////////////////
const crypto = require("crypto");
const { Cashfree } = require("cashfree-pg");

const FormData = require("form-data");
const axios = require("axios");

require("dotenv").config();
////////////////////////////////
// Import the Twilio library for sent  message
// const twilio = require("twilio");

// Twilio credentials from the Twilio Console
// const accountSid = process.env.ACCOUNT_SID; // Replace with your Account SID
// const authToken = process.env.AUTHTOKEN; // Replace with your Auth Token

// Initialize the Twilio client
// const client = new twilio(accountSid, authToken);
///////////////////////////////////////

const app = express();

app.use(
  cors({
    origin: "*", // Replace with your frontend's actual URL
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// app.use(cors(corsOptions));

app.use(express.json({ limit: "300mb" })); // 300 md on live server and local 100 mb
/////////////////////////
app.use(
  express.urlencoded({
    limit: "300mb",  // 300 md on live server and local 100 mb
    extended: true,
  })
);

Cashfree.XClientId = process.env.CLIENT_ID;
Cashfree.XClientSecret = process.env.CLIENT_SECRET;
// Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;
Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;

// ---------------------------- database start ---------------------------------------------

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

// Use the connection pool in your application
const pool = connectToWebappDB();
const server = http.createServer(app); // Create an HTTP server with Express

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
    Cashfree.PGCreateOrder("2023-08-01", request)
      .then((response) => {
        console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
        console.log(response.data.payment_session_id);
        console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
        res.json(response.data);
      })
      .catch((error) => {
        console.error(error.response.data.message);
      });
  } catch (error) {
    console.log(error);
  }
});

app.post("/api/verify", async (req, res) => {
  console.log("verify request received");
  console.log("data", req.body);
  try {
    let { orderId } = req.body;

    Cashfree.PGOrderFetchPayments("2023-08-01", orderId)
      .then((response) => {
        console.log("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
        console.log(response.data[0].payment_status);
        if (response.data[0].payment_status) {
          let paymentSuccess = response.data[0].payment_status;
          res.json(paymentSuccess);
        }
        console.log("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
      })
      .catch((error) => {
        console.error("api/verify", error.response);
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

const imageProcessingApiUrl = "http://localhost:8000/api/processImage"; // Replace with actual URL
app.post("/api/addDataInDatabase", async (req, res) => {
  console.log("addDataInDatabase request received");
  const { error, value } = schema.validate(req.body);
  try {
    var {
      order_amount,
      customer_phone,
      customer_name,
      customer_email,
      base64String, // Original base64 image
      user_selected_time,
      user_selected_date,
    } = value;

    if (!base64String) {
      return res.status(400).json({ message: "Base64 string is required." });
    }
    if (!base64String.startsWith("data:image")) {
      return res.status(400).json({ message: "Invalid Base64 image format" });
    }

    // Ensure the temp directory exists
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Convert Base64 to Image and get the correct file path
    base64Img.imgSync(base64String, tempDir, `${customer_name}_temp`);

    // FIX: Define the correct file path by appending `.jpg`
    const tempImagePath = path.join(tempDir, `${customer_name}_temp.png`);

    // Ensure the file exists before using createReadStream
    if (!fs.existsSync(tempImagePath)) {
      return res.status(500).json({ message: "Temporary image not found" });
    }

    // Prepare form data for external API
    const formData = new FormData();
    formData.append("image", fs.createReadStream(tempImagePath));

    const prossedBase64String = value.base64String.split(",")[1]; // This will remove the prefix if present

    const externalResponse = await axios.post(
      imageProcessingApiUrl,
      {
        image_base64: prossedBase64String, // Send the Base64 data directly
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    // console.log("Response from image processing API:", externalResponse.data);

    if (!externalResponse.data || !externalResponse.data.image) {
      return res
        .status(500)
        .json({ message: "Failed to process image from external API" });
    }

    // Save the new processed image
    const processedDir = path.join(__dirname, "processed_images");
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }
    const now = new Date();
    
    // Format date and time
    const dateString = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeString = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS

    const newImageBuffer = Buffer.from(externalResponse.data.image, "base64");
    const newImagePath = path.join(processedDir, `${customer_name}_${dateString}_${timeString}}.jpg`);

    fs.writeFileSync(newImagePath, newImageBuffer);

    // Remove temporary image
    // fs.unlinkSync(tempImagePath);

    // Insert user details into the database
    const query = `
        INSERT INTO users (customer_name, customer_phone, customer_email, image_path, order_amount, user_selected_date, user_selected_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;

    const values = [
      customer_name,
      customer_phone,
      customer_email,
      newImagePath,
      order_amount,
      user_selected_date,
      user_selected_time,
    ];

    const result = await pool.query(query, values);
    const newUser = result.rows[0];

    res.status(201).json({ message: "User added successfully", user: newUser });
  } catch (error) {
    console.error("Error adding data to database:", error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

// Define the folder where your media files are stored
// const mediaFolderPath = path.join("C:/web"); // local

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

// apis for book time slots start here --------------------------------------------
// Endpoint to check availability
app.get("/api/check-availability", async (req, res) => {
  const { user_selected_date, user_selected_time } = req.query;
  console.log(`Checking availability for ${user_selected_date, user_selected_time}`)

  try {
    // Query to count how many users have already booked the slot
    const result = await pool.query(
      "SELECT COUNT(*) FROM users WHERE user_selected_date = $1 AND user_selected_time = $2",
      [user_selected_date, user_selected_time]
    );

    const userCount = parseInt(result.rows[0].count);

    // If there are fewer than 10 users, the slot is available
    if (userCount < 10) {
      return res.json({ available: true, userCount });
    } else {
      // Slot is unavailable because 3 users have already booked
      return res.json({ available: false, userCount });
    }
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Endpoint to book a slot
app.post("/api/book", async (req, res) => {
  console.log("Book requested");
  const { user_selected_date, user_selected_time } = req.body;

  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM users WHERE user_selected_date = $1 AND user_selected_time = $2",
      [user_selected_date, user_selected_time]
    );

    const userCount = parseInt(result.rows[0].count);

    // If there are fewer than 3 users, the slot is available
    if (userCount > 3) {
      return res.json({
        message: "Time slot already booked. Please select another time.",
      });
    } else {
      // Insert the booking
      const insertQuery = `INSERT INTO users (user_id, image_url, date, time) VALUES ($1, $2, $3, $4)`;
      await pool.query(insertQuery, [userId, imageUrl, date, time]);

      res.status(201).json({
        message: "Booking successful!" + userId,
        imageUrl,
        date,
        time,
      });
    }
  } catch (error) {
    console.error("Error booking time slot:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// apis for book time slots end here --------------------------------------------
app.post("/api/test", (req, res) => {
  console.log("test request received:", req.body);
  res.status(200).json({ message: "test sucess" });
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).send("Not Found");
});


// Serve static files from 'media' directory  // on server only
app.use('/api/media', express.static(path.join(__dirname, 'media')));

// Start the server
server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
