// routes/upload.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const middleware = require("../middleware");

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/images/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // e.g. 1684943540000.png
  },
});

// Restrict file types to images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only images are allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Image upload route
router.post(
  "/upload-image",
  middleware.checkToken,
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ msg: "No image file uploaded" });
    }
    // Form the URL to access the file
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/images/${req.file.filename}`;
    return res.status(200).json({ imageUrl });
  }
);

module.exports = router;
