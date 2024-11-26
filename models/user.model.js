const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const User = Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["user", "customer", "admin"], // Role options
    default: "user", // Default to 'user'
  },
});

module.exports = mongoose.model("User", User);
