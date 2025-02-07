const express = require('express');
const app = express();
const cors = require("cors");
const port = 3000;

app.use(
    cors({
      origin: "*", // Replace with your frontend's actual URL
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

app.get('/api/items', (req, res) => {
  // Set correct SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Make sure headers are sent

  // Example data to send to the frontend
  const data = {
    id: 49,
    customer_name: "user_3",
    customer_phone: "9309996326",
    customer_email: "abc@gmail.com",
    image_path: "path/to/image.png",
    order_amount: "1",
    user_selected_date: "2025-01-13T18:30:00.000Z",
    user_selected_time: "10:11:00",
    created_at: "2025-01-14T04:33:56.334Z",
    image_base64: "data:image/png;base64,..." // Base64 string here
  };

  // Send data every 10 seconds (or based on your condition)
  setInterval(() => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 10000); // Sends data every 10 seconds

  // Handle client disconnection
  req.on('close', () => {
    console.log('Client disconnected');
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
