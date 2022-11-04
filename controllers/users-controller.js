const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const User = require("../models/user");
const bcrypt = require("bcryptjs"); // encrypting password
const jwt = require("jsonwebtoken");
// Dummy user
// let DUMMY_USER = [
//   {
//     id: "u1",
//     username: "admin",
//     password: "1234",
//   },
//   {
//     id: "u2",
//     username: "stephen",
//     password: "gwapo",
//   },
// ];

const getUsers = async (req, res, next) => {
  let userList;
  try {
    userList = await User.find({}, "-password"); // -password means it will exclude the password property from collection
  } catch (err) {
    return next(new HttpError("Could not find any users", 500));
  }
  res.json({ users: userList });
};

const getUserById = async (req, res, next) => {
  const uid = req.params.uid;
  // const user = DUMMY_USER.filter((u) => u.id === uid);
  let user;
  try {
    user = await User.find({ _id: uid });
  } catch (err) {
    return next(
      new HttpError("Could not find the user from the provided user id", 500)
    );
  }
  res.json({ user });
};

const signUpUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("ERROR SIGNUP", errors);
    return next(
      new HttpError("Invlaid inputs passed, please check your data", 422)
    ); // 422 invalid inputs);
  }
  console.log("SIGN UP DATA", req.body);

  const { username, password } = req.body;
  // const userExist = DUMMY_USER.filter((u) => u.username === username);
  const userExist = await User.find({ username: username });

  if (userExist.length > 0) {
    return next(new HttpError("User already exist!", 422));
  }

  // if (userExist) {
  //   const error = new HttpError("Username already exist!", 422); // 422 = invalid user input
  //   return next(error);
  // }

  // const newUser = {
  //   id: uuidv4(),
  //   username: username,
  //   password: password,
  // };
  // DUMMY_USER.push(newUser);

  // encrype the password
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError("Could not create user, please try again", 500));
  }

  const newUser = new User({
    ...req.body,
    password: hashedPassword,
    image: req.file.path, // save the image file path
  });

  try {
    await newUser.save();
  } catch (err) {
    console.log(err);
    return next(
      new HttpError(`Signing Up Failed, please try again. ${err._message}`, 500)
    );
  }

  // create token
  let token;
  try {
    token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError(`Signing Up Failed, please try again. ${err._message}`, 500)
    );
  }

  res
    .status(201)
    .json({ userId: newUser.id, username: newUser.username, token: token }); // send back newly created user data
};

const userLogin = async (req, res, next) => {
  const { username, password } = req.body;
  // const getUser = DUMMY_USER.filter(
  //   (u) => u.username === username && u.password === password
  // );

  const getUser = await User.findOne({
    username: username,
  });

  // if user does not exist
  if (!getUser) {
    return next(
      new HttpError(
        "Could not identify user, invalid username or password",
        403
      )
    );
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, getUser.password); // compare plain password to encrypted from database
  } catch (err) {
    return next(new HttpError("Invalid password!", 500));
  }

  if (!isValidPassword) {
    return next(new HttpError("Invalid password!", 500));
  }

  // if password is correct
  // create token
  let token;
  try {
    token = jwt.sign(
      { userId: getUser.id, username: getUser.username },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError(`Login Failed, please try again. ${err._message}`, 500)
    );
  }

  res.status(200).json({
    userId: getUser.id,
    username: getUser.username,
    token: token,
  });
};

exports.getUsers = getUsers;
exports.getUserById = getUserById;
exports.signUpUser = signUpUser;
exports.userLogin = userLogin;
