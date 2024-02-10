const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: String,
  latitude: Number,
  longitude: Number
});

const logSchema = new mongoose.Schema({
  method: String,
  url: String,
  status: String,
  responseTime: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = { locationSchema, logSchema };
