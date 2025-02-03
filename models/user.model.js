const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const User = Schema(
  {
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
    fcmToken: {
      type: String,
      default: "",
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
  },
  {
    // This automatically adds `createdAt` and `updatedAt` fields
    timestamps: true,
  }
);

module.exports = mongoose.model("User", User);
