// index.js

const express = require('express');
const app = express();

// Define a port
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('Hello, Node!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
