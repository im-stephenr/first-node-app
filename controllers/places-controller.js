const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const getCoordinates = require("../util/location");
const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
// Database collections
const Place = require("../models/place");
const User = require("../models/user");
const { default: mongoose } = require("mongoose");
const fs = require("fs");

/**
 *  HttpError from models/http-error that accepts 2 arguments
 */

// DUMMY DATA
let DUMMY_PLACES = [
  {
    id: "p1",
    title: "Empire State Building",
    description: "One of the most famous sky crapers in the world",
    location: {
      lat: 40.123411,
      lng: -73.1234567,
    },
    address: "20 W 34th St, New York, NY 10001",
    creator: "u1",
  },
];

// url will be /api/places/:pid
const getPlacesById = async (req, res, next) => {
  const placeId = req.params.pid;
  // const places = DUMMY_PLACES.filter((place) => place.id === placeId);
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not find the place", 500)
    );
  }
  // if id does not exist
  if (!place) {
    return next(
      new HttpError("Could not find the places for the provided placeID", 404)
    );
  }
  res.json({ place: place.toObject({ getters: true }) }); // added .toObject() to convert the _id property to id
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  // const places = DUMMY_PLACES.filter((place) => place.creator === userId);
  let places;
  // this will just get the places data from the given userID, no user information
  // try {
  //   places = await Place.find({ creator: userId });
  // } catch (err) {
  //   const error = new HttpError(
  //     "Could not find the place for the provided User ID",
  //     404
  //   );
  // }

  // get user and places JOINED, users.places will now have complete data linked from places connection
  let userWithPlaces;
  try {
    userWithPlaces = await User.find({ _id: userId }).populate("places");
  } catch (err) {
    return next(new HttpError("Something went wrong, please try again", 404));
  }
  if (userWithPlaces.length === 0) {
    // same from above but different kind of approach
    return next(
      new HttpError("Could not find the places for the provided userID", 404)
    );
  }
  // we use map instead of direct .toObject since we are using find() and not findById for converting _id property to id
  res.json({
    userWithPlaces: userWithPlaces.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const createPlace = async (req, res, next) => {
  //from express-validator package check for validations declared under routes
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    // when using async, we should use next instead of throw
    return next(
      new HttpError("Invlaid inputs passed, please check your data", 422)
    ); // 422 invalid inputs
  }

  // extract the properties of req.body from post request
  const { address } = req.body;
  let coordinates;

  // since we use async/await we wrap the function in try/catch
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    ...req.body,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId, // instead of using the userId from the front end form, we use userId declared inside check-auth custom middleware
  });

  // check if user exist when creating a place
  const user = await User.findById(req.userData.userId);

  if (!user) {
    return next(new HttpError("Could not find user for provided id", 404));
  }

  console.log(user);

  try {
    /** Logic for updating 2 collections, creating place while updating user's place property */
    const sess = await mongoose.startSession(); // start session
    sess.startTransaction(); // start session
    await createdPlace.save({ session: sess }); // create/save new place and return session id
    user.places.push(createdPlace); // access the Users > places and push/update with the newly created place id
    await user.save({ session: sess }); // update the users collection
    await sess.commitTransaction(); // end/commit the transaction
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Creating place failed, please try again..", 500)
    );
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invlaid inputs passed, please check your data", 422)
    ); // 422 invalid inputs
  }
  // extract the properties of req.body from post request
  const { title, description } = req.body;
  const placeId = req.params.pid;

  let updatedPlace;
  try {
    updatedPlace = await Place.findByIdAndUpdate(placeId, req.body, {
      runValidators: true,
      new: true,
    });
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not update place.", 422)
    );
  }
  /**
   * Check if the user who created this place is the one whos updating
   * req.userData.userId is from check-auth.js in the backend
   * added toString() to updatePlace.creator since it is an ObjectID from the database
   */

  if (updatedPlace.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this place.", 401)); // authorization error
  }

  res.status(200).json({ place: updatedPlace.toObject({ getters: true }) });

  // const updatedPlace = { ...DUMMY_PLACES.find((p) => p.id === placeId) }; // copy the data of given id
  // const placeIndex = DUMMY_PLACES.findIndex((p) => p.id === placeId); // get the index of given id
  // updatedPlace.title = title; // update the properties
  // updatedPlace.description = description; // update the properties
  // DUMMY_PLACES[placeIndex] = updatedPlace; // update the object with the specific index
};

const deletePlace = async (req, res, next) => {
  // extract the properties of req.body from post request
  const placeId = req.params.pid;

  let place;
  try {
    /**
     * .populate() is only used when a collection has relationship with other collection
     * creator will now be populated with the data in Users where creator = Users > places
     * Basically, populate is like JOIN in mysql,
     * SELECT *, (SELECT * FROM users WHERE id=places.creator) as creator
     * FROM places WHERE id=placeId
     */
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    return next(new HttpError("Something went wrong, please try again", 404));
  }

  if (!place) {
    return next(
      new HttpError(
        "Could not find the place by the provided ID, please try again",
        404
      )
    );
  }

  // Check if the user who created this place is the one whos deleting
  if (place.creator.id !== req.userData.userId) {
    return next(
      new HttpError("You are not allowed to delete this place.", 401) // 401 authorization error
    ); // authorization error
  }

  // assign image path
  const imagePath = place.image;

  // update database
  try {
    const sess = await mongoose.startSession(); // start session
    sess.startTransaction(); // start transaction
    await place.remove({ session: sess }); // remove the place and return the id
    place.creator.places.pull(place); // remove the same id inside the users places, 'pull' will automatically remove the ID from the Users > places property
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError("Could not delete the place, please try again", 404)
    );
  }

  // delete the image
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Place Deleted" });

  // if (!DUMMY_PLACES.find((p) => p.id === placeId)) {
  //   throw new HttpError("Could not find the place ID", 404);
  // }
  // DUMMY_PLACES = DUMMY_PLACES.filter((p) => p.id !== placeId); // we use filter since it returns a brand new array and wont change the existing
};

// exporting the functions
exports.getPlacesById = getPlacesById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
