const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const BlogPost = Schema({
  username: String,
  title: String,
  body: String,
  email: String, // email is unique for each user(blog addition) user can see his blog on profile too

  likedBy: {
    type: [String], // This array stores the usernames of users who liked the post
    default: [],
  },
  // coverImage: {
  //   type: String,
  //   default: "",
  // }, //cover image
  previewImage: { type: String, default: "" }, // Single preview image path
  coverImages: {
    type: [String], // Store multiple image paths
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    default: "pending", // Default status is pending, you can change this to 'approved' or 'rejected'
    enum: ["pending", "approved", "rejected"], // Enum for allowed status values
  },

  type: {
    type: String,
    required: true, // Ensure every blog has a type
    enum: ["general", "barbershop", "hospital"], // Categories of blogs
    default: "general",
  },

  lat: { type: Number }, // Add latitude
  lng: { type: Number }, // Add longitude
  imageUrls: [{ type: String }], // New field to store image URLs
  like: {
    type: Number,
    default: 0,
  },
  share: {
    type: Number,
    default: 0,
  },
  comment: {
    type: Number,
    default: 0,
  }, //we might use socket.io for real time implementation instead of refreshing
  //the page everytime when like or comment to get the curent number
});

module.exports = mongoose.model("BlogPost", BlogPost);
