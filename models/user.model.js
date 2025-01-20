const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const User = Schema({
  username: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },

  role: {
    type: String,
    enum: ["user", "shop owner", "admin"], // Role options
    default: "user", // Default to 'user'
  },

  verified: {
    type: Boolean,
    default: false, // Default is not verified
  },

  isBanned: {
    type: Boolean,
    default: false, // By default, users are not banned
  },
  profileFlag: {
    // New field to track profile creation
    type: Number,
    default: 0, // 0 = Not created, 1 = Created
  },
});

module.exports = mongoose.model("User", User);
