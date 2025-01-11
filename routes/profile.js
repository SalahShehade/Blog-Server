const express = require("express");
const router = express.Router();
const Profile = require("../models/profile.model");
//const { checkToken } = require("../middleware");
const middleware = require("../middleware");
const multer = require("multer");
const path = require("path");
const { abort } = require("process");
const User = require("../models/user.model"); // Make sure this is correct!
const admin = require("../firebase");

// Get reference to the storage bucket
const bucket = admin.storage().bucket("hajziapp.firebasestorage.app");

const storage = multer.memoryStorage(); // Switch to memory storage

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
const uploadFileToFirebase = async (file, destination) => {
  try {
    const fileUpload = bucket.file(destination);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      stream.on("error", (err) => {
        reject(new Error("Error uploading to Firebase: " + err.message));
      });

      stream.on("finish", async () => {
        try {
          await fileUpload.makePublic();
          console.log(`File ${destination} is now public.`);
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
          resolve(publicUrl);
        } catch (err) {
          console.error(`Failed to make file public: ${err}`);
          reject(new Error("Error making file public: " + err.message));
        }
      });

      stream.end(file.buffer);
    });
  } catch (error) {
    console.error("Error uploading image to Firebase:", error);
    throw error;
  }
};

router
  .route("/add/image")
  .patch(middleware.checkToken, upload.single("img"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      // Upload the file to Firebase Storage
      const firebasePath = `profileImages/${
        req.decoded.email
      }-${Date.now()}${path.extname(req.file.originalname)}`;
      const publicUrl = await uploadFileToFirebase(req.file, firebasePath);

      // Update the user's profile in the database with the Firebase URL
      const profile = await Profile.findOneAndUpdate(
        { email: req.decoded.email },
        { $set: { img: publicUrl } },
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
      console.error("Error uploading profile image:", err.message);
      res.status(500).send(err.message);
    }
  });

router.route("/add").post(middleware.checkToken, async (req, res) => {
  console.log(req.body); // Check if req.body contains the expected data
  console.log("Decoded email:", req.decoded.email);
  const profile = Profile({
    email: req.decoded.email,
    name: req.body.name,
    profession: req.body.profession,
    DOB: req.body.DOB,
    titleline: req.body.titleline,
    about: req.body.about,
  });

  // 2) Update profileFlag in User model
  await User.findOneAndUpdate(
    { email },
    { $set: { profileFlag: 1 } },
    { new: true }
  );
  profile
    .save()
    .then(() => res.json({ msg: "Profile successfully stored..." }))
    .catch((err) => {
      console.error("Database save error:", err.message);
      return res.status(400).json({ error: err.message });
    });
});

// Route to get profile data by email
router.route("/getDataByEmail").get(middleware.checkToken, async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ msg: "Email is required" });
  }

  try {
    const profile = await Profile.findOne({ email });
    if (!profile) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    // The `img` field will contain the Firebase URL if it was updated
    res.status(200).json({ data: profile });
  } catch (error) {
    console.error("❌ Error fetching profile by email:", error.message);
    res
      .status(500)
      .json({ msg: "Internal server error", error: error.message });
  }
});

router.route("/checkProfile").get(middleware.checkToken, async (req, res) => {
  try {
    const result = await Profile.findOne({ email: req.decoded.email });

    if (!result) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    // Ensure the 'img' field is included in the response
    return res.json({
      Status: true,
      email: req.decoded.email,
      img: result.img, // Include the image URL
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.route("/getData").get(middleware.checkToken, async (req, res) => {
  const result = await Profile.findOne({
    email: req.decoded.email,
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
    email: req.decoded.email,
  });
  if (!result) profile = {};
  if (result == null) {
    profile = result;
  }
  const updateResult = await Profile.findOneAndUpdate(
    {
      email: req.decoded.email,
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
