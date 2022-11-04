const axios = require("axios");
const HttpError = require("../models/http-error");
const API_KEY = "";
async function getCoordsForAddress(address) {
  return {
    lat: (Math.random() * 360 - 180).toFixed(8), // generate random
    lng: (Math.random() * 180 - 90).toFixed(8), // generate random
  };
  // since we dont have google api key
  //   const response = await axios.get(
  //     `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
  //       address
  //     )}&key=YOUR_API_KEY`
  //   );
  //   const data = response.data;

  //   if (!data || data.status === "ZERO_RESULTS") {
  //     throw new HttpError("Could not find location", 422); // 422 = invalid inputs
  //   }
  //   const coordinates = data.results[0].geometry.location;

  //   return coordinates;
}

module.exports = getCoordsForAddress;
