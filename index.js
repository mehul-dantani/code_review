// index.js

const express = require('express');
const app = express();

// Define a port
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

ap.user(express.json)
console.log(abcd)
// Basic route
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
