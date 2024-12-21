const mongoose = require("mongoose");

const AddBlogApprovalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  email: {
    type: String,
    required: true,
  },
  username: { type: String },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },

  type: {
    type: String,
    required: true, // Ensure every blog has a type
    enum: ["general", "barbershop", "hospital"], // Categories of blogs
    default: "general",
  },

  lat: { type: Number }, // Add latitude
  lng: { type: Number }, // Add longitude
  createdAt: { type: Date, default: Date.now },
});

AddBlogApprovalSchema.index({ title: 1, body: 1 }, { unique: true }); //to help not dublicate

module.exports = mongoose.model("AddBlogApproval", AddBlogApprovalSchema);
