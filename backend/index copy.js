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

require("dotenv").config();
////////////////////////////////
// Import the Twilio library for sent  message
const twilio = require("twilio");

// Twilio credentials from the Twilio Console
const accountSid = process.env.ACCOUNT_SID; // Replace with your Account SID
const authToken = process.env.AUTHTOKEN; // Replace with your Auth Token

// Initialize the Twilio client
const client = new twilio(accountSid, authToken);
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

// API endpoint for registration
app.post("/api/addDataInDatabase", async (req, res) => {
  console.log("addDataInDatabase request received");
  // Validate request body against the schema
  const { error, value } = schema.validate(req.body);
  try {
    // Destructure the validated request body
    var {
      order_amount,
      customer_phone,
      customer_name,
      customer_email,
      base64String,
      user_selected_date,
      user_selected_time,
    } = value;

    base64String_data = base64String;

    // Ensure base64String is present
    if (!base64String) {
      return res.status(400).json({ message: "Base64 string is required." });
    }

    const now = new Date();
    const dateString = now.toISOString().replace(/:/g, "-"); // Format date to avoid colons in filenames
    const fileName = `${customer_name}_${dateString}`; // Create filename with customer name and date

    // Save the image and get the path
    const imagePath = base64Img.imgSync(base64String, imageDir, fileName);

    // Prepare the SQL query
    const query = `
            INSERT INTO users (customer_name, customer_phone, customer_email, image_path, order_amount, 
        user_selected_date, user_selected_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
    const values = [
      customer_name,
      customer_phone,
      customer_email,
      imagePath,
      order_amount,
      user_selected_date,
      user_selected_time,
    ];

    // Execute the query
    const result = await pool.query(query, values);
    const newUser = result.rows[0];

    // Send a success response
    res.status(201).json({ message: "User added successfully", user: newUser });
  } catch (error) {
    console.error("Error adding data to database:", error);
    // Send an error response
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});
app.post("/api/upload", async (req, res) => {
  const { screenshot, customer_name, customer_phone } = req.body;

  console.log("Received screenshot for customer:", customer_name);

  const imageDir2 = "./screenshoots"; // Directory where images will be saved
  if (!fs.existsSync(imageDir2)) {
    fs.mkdirSync(imageDir2, { recursive: true });
  }

  const now = new Date();
  const dateString = now.toISOString().replace(/:/g, "-"); // Format date for filename
  const fileName = `${customer_name}_${dateString}`;
  const imagePath = path.join(imageDir2, fileName);

  try {
    // Save the image
    base64Img.imgSync(screenshot, imageDir2, fileName);

    // Public URL for the image
    const imageUrl = `https://your-domain.com/screenshoots/${fileName}.png`;

    // // Send SMS to the customer
    // await client.messages.create({
    //   body: `Hello ${customer_name}, your image has been saved! You can view it here: ${imageUrl}`,
    //   from: "+14427776938",
    //   to: `+91${customer_phone}`,
    // });

    // console.log(`Message sent successfully to ${customer_phone}`);

    // res.json({
    //   status: "success",
    //   message: "Screenshot received and SMS sent",
    //   imagePath: imageUrl,
    // });
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to process request",
    });
  }
});

// Define the folder where your media files are stored
const mediaFolderPath = path.join("C:/web");

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

      res
        .status(201)
        .json({
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

// Function to check date and time, then trigger sending SSE data
async function checkAndTriggerSSE() {
  console.log("checkAndTriggerSSE");
  try {
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    const currentTimeString = currentDate
      .toTimeString()
      .split(":")
      .slice(0, 2)
      .join(":"); // Format as HH:MM

    console.log("values: ", [currentDateString, currentTimeString]);

    const query = `
      SELECT * FROM users
      WHERE user_selected_date::date = $1::date
      AND to_char(user_selected_time::time, 'HH24:MI') = $2
      ORDER BY id 
    `;
    const values = [currentDateString, currentTimeString];

    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      console.log("result rows:", result.rows.length);
      const items = [];

      // Loop through all the results and handle each one
      for (const item of result.rows) {
        const imagePath = item.image_path;

        try {
          console.log("Fetching image data for customer:", item.customer_name);
          const imageData = await fss.readFile(imagePath, "base64");
          item.image_base64 = `data:image/png;base64,${imageData}`;
        } catch (fileError) {
          console.error(
            "Error reading image file for customer:",
            item.customer_name,
            fileError
          );
          item.image_base64 = null;
        }

        console.log("Item prepared:", item.customer_name);
        items.push(item); // Add each item to the array
      }

      return items; // Return all items
    } else {
      console.log("No results found for the specified date and time");
      return []; // Return an empty array if no results
    }
  } catch (err) {
    console.error("Error fetching items:", err);
    return { error: "Failed to fetch items" };
  }
}

// SSE endpoint
app.get("/api/items", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Ensure headers are sent immediately

  const sendData = async () => {
    try {
      const items = await checkAndTriggerSSE(); // Fetch all items

      if (Array.isArray(items) && items.length > 0) {
        // Loop through and send each item
        // for (const item of items) {
        //   console.log("Sending item: ", item.customer_name);
        //   res.write(`data: ${JSON.stringify(item)}\n\n`);
        //   await new Promise((resolve) => setTimeout(resolve, 1000)); // Optional: delay between each item
        // }

        await Promise.all(
          items.map(async (item) => {
            console.log("Sending item: ", item.customer_name);
            res.write(`data: ${JSON.stringify(item)}\n\n`);
            // Optional: add artificial delay here if needed
          })
        );
      } else {
        console.log("No items to send");
      }
    } catch (error) {
      console.error("Error in sendData:", error);
    }
  };

  // Send initial data once
  sendData();

  // Set interval to send data periodically
  const intervalId = setInterval(sendData, 40000); // Every 10 seconds

  req.on("close", () => {
    clearInterval(intervalId);
    console.log("Client disconnected");
  });
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

// Start the server
server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
