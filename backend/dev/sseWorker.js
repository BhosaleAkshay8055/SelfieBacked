const { parentPort } = require('worker_threads');
const { Pool } = require('pg');
const fs = require('fs').promises;

const pool = new Pool({
  // Your PostgreSQL connection config
  user: "postgres",
  host: "localhost",
  database: "webapp", // Now switch to `webapp` database
  password: "1234",
  port: 5432,
});

parentPort.on('message', async () => {
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
      // Process each row to add image data
      for (let item of result.rows) {
        const imagePath = item.image_path;

        try {
          const imageData = await fs.readFile(imagePath, "base64");
          item.image_base64 = `data:image/png;base64,${imageData}`;
        } catch (fileError) {
          console.error("Error reading image file:", fileError);
          item.image_base64 = null;
        }
      }

      // Send the processed data back to the main thread
      parentPort.postMessage(result.rows);
    }
  } catch (error) {
    console.error("Error in worker:", error);
  }
});
