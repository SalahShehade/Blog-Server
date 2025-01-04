const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const middleware = require("../middleware");

// Configure storage for multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/images/'); // Ensure this directory exists
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // e.g., 1631028240000.png
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if(mimetype && extname){
    return cb(null, true);
  }
  cb(new Error('Only images are allowed'));
};

// Initialize multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Image upload route
router.post("/upload-image", middleware.checkToken, upload.single('image'), (req, res) => {
  if(!req.file){
    return res.status(400).json({ msg: "No file uploaded" });
  }
  
  // Assuming you serve static files from the 'uploads' directory
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/images/${req.file.filename}`;
  res.status(200).json({ imageUrl });
});

module.exports = router;
