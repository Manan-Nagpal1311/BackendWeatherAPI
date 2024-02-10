const redis = require('redis');

// Create Redis client
const client = redis.createClient('redis://localhost:6379');

// Handle Redis connection errors
client.on('error', function(err) {
  console.error('Error connecting to Redis:', err);
});

module.exports = client;
