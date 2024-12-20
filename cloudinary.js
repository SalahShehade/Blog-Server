const cloudinary = require("cloudinary").v2;

// Extract values from the Cloudinary URL
const cloudinaryConfig = {
  cloud_name: "hwvqws9m7",
  api_key: "382463866467855",
  api_secret: "OawxpnQFfMieSX4xouS9O1gRCjU",
};

// Configure Cloudinary
cloudinary.config(cloudinaryConfig);

module.exports = cloudinary;
