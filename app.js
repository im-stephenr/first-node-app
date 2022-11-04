const express = require("express");
const bodyParser = require("body-parser");
const HttpError = require("./models/http-error");
const mongoose = require("mongoose");
const fs = require("fs"); // file system module, allows you to modify files in the server
const path = require("path");

const app = express();

// own imports
// route for places-routes
const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");

// NOTE: Must add before the middleware whos going to use it
app.use(bodyParser.json());

// allow the front end to access uploads/images folder
app.use("/uploads/images", express.static(path.join("uploads", "images")));

// Allows us to communicate between different domain
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // * means allow any domain to access
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

// setting /api/places for place routes
app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route", 404);
  throw error; // use throw if middleware function is synchronous
});

// if parameter is 4, express will recognize this as a special middleware, as a error middleware
app.use((error, req, res, next) => {
  // if there is a file
  if (req.file) {
    // remove the file if signup is not successfully
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headersSent) {
    return next(error);
  }

  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured!" });
});

// Connect to database
mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gudqyrg.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(5000, () => {
      console.log("Listening to port 5000");
    });
  })
  .catch((err) => console.log("Error occured ", err));
