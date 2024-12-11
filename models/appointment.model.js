const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  blogId: { type: String, required: true },
  userName: { type: String, required: true },
  time: { type: String, required: true },
  duration: { type: Number, default: 30 },
  isConfirmed: { type: Boolean, default: false },
});

module.exports = mongoose.model("Appointment", appointmentSchema);
