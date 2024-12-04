const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Profile = Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },

    username: {
      type: String,
    },

    name: String,
    profession: String,
    DOB: String,
    titleline: String,
    about: String,
    img: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Profile", Profile);
