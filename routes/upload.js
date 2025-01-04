// routes/upload.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const middleware = require("../middleware"); // Ensure this path is correct

// Configure multer storage with absolute path
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use absolute path to the uploads/images directory
    const uploadPath = path.join(__dirname, "../uploads/images/");
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // e.g., 1684943540000.png
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

// Initialize multer with the updated storage and file filter
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Image upload route with enhanced error handling
router.post(
  "/upload-image",
  middleware.checkToken, // Ensure the user is authenticated
  upload.single("image"), // The field name should match the frontend
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ msg: "No image file uploaded" });
      }

      // Form the URL to access the file
      const imageUrl = `${req.protocol}://${req.get("host")}/uploads/images/${req.file.filename}`;
      return res.status(200).json({ imageUrl });
    } catch (error) {
      console.error("❌ Error in /upload-image route:", error.message);
      return res
        .status(500)
        .json({ msg: "Internal server error", error: error.message });
    }
  }
);

// Enhanced error handling middleware for multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle multer-specific errors
    console.error("Multer Error:", err.message);
    return res.status(400).json({ msg: err.message });
  } else if (err) {
    // Handle other errors
    console.error("Error:", err.message);
    return res.status(400).json({ msg: err.message });
  }
  next();
});

module.exports = router;
