const express = require('express');
const fs = require('fs');
const path = require('path');
const base64Img = require('base64-img');
const cors = require("cors");
// Uncomment the next line if you want to use Twilio for SMS
// const client = require('twilio')(accountSid, authToken);

const app = express();
const PORT = 5000; // Change this to the port you want to run the server on

app.use(
    cors({
      origin: "*", // Replace with your frontend's actual URL
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

// Middleware to parse JSON request bodies
app.use(express.json({ limit: "100mb" }));
app.use(
  express.urlencoded({
    limit: "100mb",
    extended: true,
  })
);


// POST API endpoint
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

    // Uncomment the following block if you want to send an SMS
    /*
    await client.messages.create({
      body: `Hello ${customer_name}, your image has been saved! You can view it here: ${imageUrl}`,
      from: "+14427776938",
      to: `+91${customer_phone}`,
    });

    console.log(`Message sent successfully to ${customer_phone}`);
    */

    res.json({
      status: "success",
      message: "Screenshot received and saved",
      imagePath: imageUrl,
    });
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to process request",
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Upload server running on http://localhost:${PORT}/api/upload`);
});
