// Import the Twilio library
const twilio = require('twilio');
require("dotenv").config();

// Twilio credentials from the Twilio Console
const accountSid = "AC658323edf1393beffd42aeabb3b8b68d"; // Replace with your Account SID
const authToken = "2501dd786dd56748fffd5e33fcc8c1e5";   // Replace with your Auth Token

// Initialize the Twilio client
const client = new twilio(accountSid, authToken);

// Send a message
client.messages
  .create({
    body: 'Hello! This message from node js.', // Your message body
    from: '+14427776938', // Your Twilio phone number
    to: '+919309996326'    // Recipient's phone number
  })
  .then(message => console.log(`Message sent successfully! SID: ${message.sid}`))
  .catch(error => console.error('Error sending message:', error));
