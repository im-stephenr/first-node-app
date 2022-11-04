const express = require("express");
const { check } = require("express-validator");

// custom class made under model folder
const HttpError = require("../models/http-error");

// import the controller
const placesControllers = require("../controllers/places-controller");

const router = express.Router();

// custom middleware
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

// url will be /api/places/:pid
router.get("/:pid", placesControllers.getPlacesById);

// url will be /api/places/user/:uid
router.get("/user/:uid", placesControllers.getPlacesByUserId);

// check token when accessing the backend middleware, should be added above the routes
router.use(checkAuth);

router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesControllers.createPlace
);

router.patch(
  "/:pid",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  placesControllers.updatePlace
);

router.delete("/:pid", placesControllers.deletePlace);

module.exports = router;
