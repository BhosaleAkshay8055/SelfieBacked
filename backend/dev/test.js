const express = require('express');
const app = express();
const PORT = 3001;

app.get('/waittime', (req, res) => {
    console.log('New SSE client connected');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send SSE data periodically (example data)
    // setInterval(() => {
        console.log('Sending data to SSE client');
        res.write(`data: ${JSON.stringify({ waitTime: 10000 })}\n\n`); // example wait time in ms
    // }, );

    req.on('close', () => {
        console.log('Client disconnected from SSE');
        res.end();
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
