const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  blogId: { type: String, required: true },
  userName: { type: String, required: true, default: "Available Slot" }, // Default for available slots
  time: { type: String, required: true }, // Time in HH:mm format
  duration: { type: Number, default: 30 }, // Default duration 30 minutes
  isConfirmed: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["booked", "available"],
    default: "available", // Available slots are "available" by default
  },
  // NEW FIELD: Store a specific date (YYYY-MM-DD for example)
  date: { type: String, required: true },
});

module.exports = mongoose.model("Appointment", appointmentSchema);
