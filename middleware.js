const express = require('express');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { locationSchema, logSchema } = require('./schemas.js');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
});

const Log = mongoose.model('Log', logSchema);
const loggingMiddleware = morgan('combined', {
  stream: {
    write: async function(log) {
      const logData = log.split(' ');
      const newLog = new Log({
        method: logData[5].substring(1),
        url: logData[6],
        status: logData[8],
        responseTime: logData[9]+'ms'
      });
      await newLog.save();
      console.log('Log saved successfully: ', log);
    }
  }
});

const jsonParser = express.json();

module.exports = {
  limiter,
  loggingMiddleware,
  jsonParser
};
