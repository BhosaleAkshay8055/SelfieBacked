const express = require('express');
const fs = require('fs'); // File system module for reading files
const { Pool } = require('pg'); // PostgreSQL client
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(
    cors({
      origin: "*", // Replace with your frontend's actual URL
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

// Configure PostgreSQL connection
const pool = new Pool({
  // Provide your PostgreSQL configuration here
  user: 'postgres',
  host: 'localhost',
  database: 'webapp',
  password: '1234',
  port: 5432, // Default PostgreSQL port
});

// SSE endpoint
app.get("/api/items", async (req, res) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();  // Start the response immediately

  // Store sent data IDs to avoid sending the same data again
  const sentDataIds = new Set();

  // Function to send SSE events
  const sendSSEEvent = (message) => {
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  };

  // Simulate sending data every 10 seconds (adjust as needed)
  const intervalId = setInterval(async () => {
    try {
      const currentDate = new Date();
      const currentDateString = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
      const currentTimeString = currentDate.toTimeString().split(":").slice(0, 2).join(":"); // Format as HH:MM

      const query = `
        SELECT * FROM users
        WHERE user_selected_date::date = $1::date
        AND to_char(user_selected_time::time, 'HH24:MI') = $2
        ORDER BY id 
      `;
      const result = await pool.query(query, [currentDateString, currentTimeString]);

      if (result.rows.length > 0) {
        // Filter out rows that have already been sent
        const newRows = result.rows.filter(row => !sentDataIds.has(row.id));

        if (newRows.length > 0) {
          // Process each row to add image data
          for (let item of newRows) {
            const imagePath = item.image_path;

            try {
              // Read the image file and convert it to base64
              const imageData = await fs.promises.readFile(imagePath, "base64"); // Use promises for async/await

              // Add base64 string to the item object
              item.image_base64 = `data:image/png;base64,${imageData}`; // Prefix with MIME type
            } catch (fileError) {
              console.error("Error reading image file:", fileError);
              item.image_base64 = null; // Set to null if reading fails
            }
          }

          // Send the new rows with image data as SSE
          sendSSEEvent(newRows);

          // Mark the new data as sent
          newRows.forEach(row => sentDataIds.add(row.id));
        }
      }
    } catch (error) {
      console.error("Error fetching data for SSE:", error);
    }
  }, 10000); // Adjust interval as needed (10 seconds here)

  // Close the SSE connection after a timeout or when the client disconnects
  req.on("close", () => {
    console.log("SSE connection closed");
    clearInterval(intervalId); // Clear the interval to stop sending data
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`SSE server running on http://localhost:${PORT}/api/items`);
});
