const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config()
const client = require('./redisConfig');
const { limiter, loggingMiddleware, jsonParser } = require('./middleware');
const { locationSchema, logSchema } = require('./schemas.js');

(async function() {
  try {
    await client.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Error connecting to Redis', err);
  }
})();

const app = express();
app.use(limiter); //rate limitting
app.use(jsonParser); // for parsing application/json
app.use(loggingMiddleware); // Logging middleware to log HTTP requests into MongoDB
const API_KEY = process.env.API_KEY;
const port = process.env.PORT;

// Connect to MongoDB
const uri = process.env.MONGO_URI;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('remote mongoDB connected.............');
}).catch((err) => {
  console.log(err); 
})


// Create a model
const Location = mongoose.model('Location', locationSchema);

// GET all locations
// curl -X GET http://localhost:3033/locations
app.get('/locations', async function(req, res){
  try {
    const locations = await Location.find({});
    res.send(locations);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error occurred while fetching locations');
  }
});

// POST a new location
// curl -X POST -H "Content-Type: application/json" -d '{"name":"New Location", "latitude":12.9715987, "longitude":77.5945627}' http://localhost:3033/locations
app.post('/locations', async function(req, res){
  const newLocation = new Location(req.body);
  let response;
  try {
    // Validate the coordinates by making a request to the OpenWeatherMap API
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${newLocation.latitude}&lon=${newLocation.longitude}&appid=${API_KEY}`;
    const key = `${newLocation.latitude}_${newLocation.longitude}`;
    const value = await client.get(key);
    let fetchedFromRedis = false;
    if (value !== null) {
      response = JSON.parse(value);
      fetchedFromRedis = true;
    } else {
      response = (await axios.get(url)).data;
      // Save the response to the cache for 1 hour
      client.set(key, JSON.stringify(response), 'EX', 3600);
    }

    if (response.cod === 200) {
      // If the API returns a 200 status code, the coordinates are valid
      let responseMessage;
      if(!fetchedFromRedis) {
        await newLocation.save();
        responseMessage = 'Location added successfully';
      } else {
        responseMessage = 'Location already present in db please update the location details!';
      }
      res.send(responseMessage);
    } else {
      // If the API returns an error, the coordinates are not valid
      res.status(400).send('Invalid location or coordinates');
    }
  } catch (err) {
    console.error(err);
    res.status(err.response.data.cod).send(err.response.data.message);
  }
});


// GET a specific location by ID
// curl -X GET http://localhost:3033/locations/<location_id>
app.get('/locations/:location_id', async function(req, res){
  const locationId = req.params.location_id;
  try {
    const location = await Location.findById(locationId);
    if (location) {
      res.send(location);
    } else {
      res.status(404).send('Location not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error occurred while fetching location');
  }
});

// PUT a specific location by ID
// curl -X PUT -H "Content-Type: application/json" -d '{"name":"Updated Location", "latitude":12.9715987, "longitude":77.5945627}' http://localhost:3033/locations/<location_id>
app.put('/locations/:location_id', async function(req, res){
  const locationId = req.params.location_id;
  const updatedLocation = req.body;
  let response;
  try {
    // Fetch the current location
    const currentLocation = await Location.findById(locationId);
    if (!currentLocation) {
      return res.status(404).send('Location not found');
    }

    // Delete the old key from the cache
    const oldKey = `${currentLocation.latitude}_${currentLocation.longitude}`;
    client.del(oldKey, function(err, response) {
      if (err) {
        console.error('Error occurred while deleting key from cache', err);
      } else {
        console.log('Old key deleted from cache');
      }
    });

    // Validate the coordinates by making a request to the OpenWeatherMap API
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${updatedLocation.latitude}&lon=${updatedLocation.longitude}&appid=${API_KEY}`;
    response = await axios.get(url);

    if (response.data.cod === 200) {
      // If the API returns a 200 status code, the coordinates are valid
      await Location.findByIdAndUpdate(locationId, updatedLocation);

      // Add the new key to the cache
      const newKey = `${updatedLocation.latitude}_${updatedLocation.longitude}`;
      client.set(newKey, JSON.stringify(response.data), 'EX', 3600);

      res.send('Location updated successfully');
    } else {
      // If the API returns an error, the coordinates are not valid
      res.status(400).send('Invalid location or coordinates');
    }
  } catch (err) {
    console.error(err);
    res.status(err.response.data.cod).send(err.response.data.message);
  }
});


// DELETE a specific location by ID
// curl -X DELETE http://localhost:3033/locations/<location_id>
app.delete('/locations/:location_id', async function(req, res){
  const locationId = req.params.location_id;
  try {
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).send('Location not found');
    }

    const key = `${location.latitude}_${location.longitude}`;
    client.del(key, function(err, response) {
      if (err) {
        console.error('Error occurred while deleting key from cache', err);
      } else {
        console.log('Key deleted from cache');
      }
    });

    await Location.findByIdAndDelete(locationId);
    res.send('Location deleted successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error occurred while deleting location');
  }
});


// GET the weather forecast for a specific location
// curl -X GET http://localhost:3033/weather/<location_id>
app.get('/weather/:location_id', async function(req, res){
  const locationId = req.params.location_id;
  try {
    const location = await Location.findById(locationId);
    if (location) {
      let url;
      const key = `${location.latitude}_${location.longitude}`;
      const value = await client.get(key);
      if (value !== null) {
        console.log('fetched from redis cache');
        res.send(JSON.parse(value));
      } else {
        if (location.latitude && location.longitude) {
          // Use latitude and longitude if they are present
          url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&units=metric&appid=${API_KEY}`;
        } else {
          // Otherwise, use the location name
          url = `https://api.openweathermap.org/data/2.5/weather?q=${location.name}&units=metric&appid=${API_KEY}`;
        }
        const response = await axios.get(url);
        // Save the response to the cache for 1 hour
        client.set(key, JSON.stringify(response.data), 'EX', 3600);
        res.send(response.data);
      }
    } else {
      res.status(404).send('Location not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


// GET the historical data and show the summary
app.get('/history/:days', function(req, res){
  const days = req.params.days;
  // You need to implement the logic to get the historical data from your database
  // and calculate the summary
});

app.listen(port, function() {
  console.log(`server runing at: ${port}`);
});