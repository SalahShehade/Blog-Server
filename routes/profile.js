const express = require("express");
const router = express.Router();
const Profile = require("../models/profile.model");
//const { checkToken } = require("../middleware");
const middleware = require("../middleware");
const multer = require("multer");
const path = require("path");
const { abort } = require("process");

const storage = multer.diskStorage({
  //the path to store the image and file name
  destination: (req, file, cb) => {
    cb(null, "./uploads"); //uploads is the folder that stores the img
  },
  filename: (req, file, cb) => {
    cb(null, req.decoded.username + ".jpg"); //use username to make it unique
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype == "image/jpeg" || file.mimetype == "image/png") {
    cb(null, true); //callback is true if jpeg or png
  } else {
    cb(null, false);
  }
};
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 6, //6 MB
  },
  //  fileFilter: fileFilter, // orginally any kind of file can be submitted like img,pdf,doc
});

router
  .route("/add/image")
  .patch(middleware.checkToken, upload.single("img"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const profile = await Profile.findOneAndUpdate(
        { username: req.decoded.username },
        { $set: { img: req.file.path } },
        { new: true }
      );

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.status(200).json({
        message: "The image added has been successfully updated",
        data: profile,
      });
    } catch (err) {
      res.status(500).send(err);
    }
  });

router.route("/add").post(middleware.checkToken, (req, res) => {
  console.log(req.body); // Check if req.body contains the expected data
  const profile = Profile({
    username: req.decoded.username,
    name: req.body.name,
    profession: req.body.profession,
    DOB: req.body.DOB,
    titleline: req.body.titleline,
    about: req.body.about,
  });

  profile
    .save() //store to database
    .then(() => {
      return res.json({ msg: "Profile sucessfully stored..." });
    })
    .catch((err) => {
      return res.status(400).json({ err: err });
    });
});

router.route("/checkProfile").get(middleware.checkToken, async (req, res) => {
  // to check wether the usrname exists or not
  try {
    const result = await Profile.findOne({ username: req.decoded.username }); //since username is provided as unique

    if (!result) {
      return res.status(404).json({ msg: "Profile not found" });
    }
    if (result != null) {
      return res.json({
        Status: true,
        username: req.decoded.username, // this part is added newly for drawer username and profile picture
      });
    } else {
      return res.json({
        Status: false,
        username: req.decoded.username,
      });
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.route("/getData").get(middleware.checkToken, async (req, res) => {
  const result = await Profile.findOne({
    username: req.decoded.username,
  });
  if (!result) return res.json("Data not found");
  if (result != null) {
    return res.json({ data: result });
  } else {
    return res.json({ data: [] });
  }
});

//rest api to update any single data the user wants to update
//no img needed since patch add/image is there
router.route("/update").patch(middleware.checkToken, async (req, res) => {
  let profile = {};
  const result = await Profile.findOne({
    username: req.decoded.username,
  });
  if (!result) profile = {};
  if (result == null) {
    profile = result;
  }
  const updateResult = await Profile.findOneAndUpdate(
    {
      username: req.decoded.username,
    },
    {
      $set: {
        name: req.body.name ? req.body.name : profile.name,
        profession: req.body.profession
          ? req.body.profession
          : profile.profession,
        DOB: req.body.DOB ? req.body.DOB : profile.DOB,
        titleline: req.body.titleline ? req.body.titleline : profile.titleline,
        about: req.body.about ? req.body.about : profile.about,
      }, //provide the thing u want to update
    },
    { new: true } // imediately effect the changes
  );
  if (!updateResult) {
    return req.json("Data not found...");
  }
  if (updateResult != null) {
    return res.json({ data: updateResult });
  } else {
    return res.json({ data: [] });
  }
});
//assignment do delete profile data
module.exports = router;
