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
    enum: ["user", "customer", "admin"], // Role options
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
});

module.exports = mongoose.model("User", User);
