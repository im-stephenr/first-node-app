const HttpError = require("../models/http-error");
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // Since browsers initially sends OPTIONS as method, we add this condition so it will continue to next middleware and not cause error
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    // add/check the token in the request headers instead of adding it in the url parameters so our parameter is much cleaner
    const token = req.headers.authorization.split(" ")[1]; // Authorization: 'Bearer TOKEN'
    if (!token) {
      throw new Error("Authentication Failed!");
    }

    // if header has token
    const decodedToken = jwt.verify(token, process.env.JWT_KEY); // returns the data stored in the token
    req.userData = { userId: decodedToken.userId }; // store the id inside userData
    next(); // proceed to next middleware
  } catch (err) {
    return next(new HttpError("Authentication Failed!", 401)); // 401 not authenticated
  }
};
