const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  blogId: { type: String, required: true },
  userName: { type: String, required: true, default: "Available Slot" }, // Default for available slots
  //time: { type: String, required: true }, // Time in HH:mm format
  date: { type: Date, required: true }, // The exact date/time of the appointment
  duration: { type: Number, default: 30 }, // Default duration 30 minutes
  isConfirmed: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["booked", "available", "expired"],
    default: "available", // Available slots are "available" by default
  },
});

module.exports = mongoose.model("Appointment", appointmentSchema);
