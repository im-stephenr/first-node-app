const express = require("express");
const { check } = require("express-validator");

// custom class made under model folder
const HttpError = require("../models/http-error");

// import the controller
const usersController = require("../controllers/users-controller");

// custom middleware
const fileUpload = require("../middleware/file-upload");

const router = express.Router();

// url will be /api/users
router.get("/", usersController.getUsers);

// get user by ID route, /api/users/:uid
router.get("/:uid", usersController.getUserById);

// signup /api/users/signup
router.post(
  "/signup",
  fileUpload.single("image"),
  [check("username").not().isEmpty(), check("password").isLength({ min: 5 })],
  usersController.signUpUser
);

// user login /api/users/login
router.post("/login", usersController.userLogin);

module.exports = router;
