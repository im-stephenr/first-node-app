const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

// types of file allowed
const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const fileUpload = multer({
  limits: 5000000, // set filesize limit 5mb
  storage: multer.diskStorage({
    // set where the image is stored
    destination: (req, file, cb) => {
      cb(null, "uploads/images"); // upload destination
    },
    // set the file name
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype]; // extract extention
      cb(null, uuidv4() + "." + ext); // creates filename
    },
  }),
  // filter allowed files
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype]; // check valid extension, double !! is setting the data as boolean
    let error = isValid ? null : new Error("Invalid mime type!");
    cb(error, isValid);
  },
});

module.exports = fileUpload;
