const express = require("express");
const User = require("../models/user.model");
const config = require("../config");
const jwt = require("jsonwebtoken");
const middleware = require("../middleware");

const router = express.Router();

// Add a field to track if the user is verified
router.route("/verify/:email").get(async (req, res) => {
  try {
    console.log("Incoming request to /verify/:email");
    console.log("req.params:", req.params);

    const email = req.params.email;
    if (!email) {
      console.error("Email not provided in params");
      return res.status(400).json({ msg: "Email is required" });
    }

    const result = await User.findOneAndUpdate(
      { email: email },
      { $set: { verified: true } },
      { new: true }
    );

    if (!result) {
      console.error("No user found with email:", email);
      return res.status(404).json({ msg: "User not found" });
    }

    console.log("User successfully verified:", result);
    res.status(200).json({ msg: "User successfully verified!" });
  } catch (err) {
    console.error("Error in /verify/:email:", err.message);
    res.status(500).json({ msg: err.message });
  }
});

// Route to check if the user is verified
router.route("/isVerified/:email").get(async (req, res) => {
  try {
    console.log("Incoming request to /isVerified/:email");
    console.log("req.params:", req.params);

    const email = req.params.email;
    if (!email) {
      console.error("Email not provided in params");
      return res.status(400).json({ msg: "Email is required" });
    }

    const result = await User.findOne({ email: email });

    if (!result) {
      console.error("No user found with email:", email);
      return res.status(404).json({ msg: "User not found" });
    }

    console.log("Verification status for user:", result.verified);
    res.status(200).json({ verified: result.verified });
  } catch (err) {
    console.error("Error in /isVerified/:email:", err.message);
    res.status(500).json({ msg: err.message });
  }
});

router.route("/:email").get(middleware.checkToken, async (req, res) => {
  try {
    const result = await User.findOne({ email: req.params.email });

    if (!result) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json({
      data: result,
      email: req.params.email,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.route("/:username").get(middleware.checkToken, async (req, res) => {
  try {
    const result = await User.findOne({ username: req.params.username });

    if (!result) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json({
      data: result,
      username: req.params.username,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.route("/checkemail/:email").get(async (req, res) => {
  // to check wether the username exists or not
  try {
    const result = await User.findOne({ email: req.params.email });

    if (!result) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (result != null) {
      return res.json({
        Status: true,
      });
    } else {
      return res.json({
        Status: false,
      });
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.route("/checkusername/:username").get(async (req, res) => {
  // to check wether the username exists or not
  try {
    const result = await User.findOne({ username: req.params.username });

    if (!result) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (result != null) {
      return res.json({
        Status: true,
      });
    } else {
      return res.json({
        Status: false,
      });
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// router.route("/login").post(async (req, res) => {
//   try {
//     const result = await User.findOne({
//       username: req.body.username,
//     });

//     if (result == null) {
//       return res.status(403).json({ msg: " Username incorrect" });
//     }
//     if (result.password == req.body.password) {
//       let token = jwt.sign({ username: req.body.username }, config.key, {
//         //    expiresIn: "24h", //token expires in 24 hours
//       });
//       res.json({
//         token: token,
//         msg: "success",
//       });
//     } else {
//       res.status(403).json("password is incorrect");
//     }
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });
// router.route("/register").post((req, res) => {
//   console.log("inside the register");
//   const user = new User({
//     username: req.body.username,
//     password: req.body.password, // corrected spelling
//     email: req.body.email,
//   });

//   user
//     .save() //store user Data to MongoDB
//     .then(() => {
//       console.log("user registered");
//       res.status(200).json("ok");
//     })
//     .catch((err) => {
//       res.status(403).json({ msg: err });
//     });
// });

router.route("/login").post(async (req, res) => {
  try {
    const result = await User.findOne({ email: req.body.email });

    if (result == null) {
      return res.status(403).json({ msg: "Email is incorrect" });
    }

    if (result.password === req.body.password) {
      // Include the role in the JWT payload
      const token = jwt.sign(
        {
          email: result.email,
          role: result.role, // Include the user's role
        },
        config.key,
        {
          // expiresIn: "24h", // Token expires in 24 hours
        }
      );

      return res.json({
        token: token,
        role: result.role,
        msg: "Login successful",
      });
    } else {
      return res.status(403).json({ msg: "Password is incorrect" });
    }
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
});

router.route("/register").post(async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    // Restrict role assignment
    const validRoles = ["user", "customer", "admin"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ msg: "Invalid role" });
    }

    const newUser = new User({
      username,
      password,
      email,
      role: role || "user", // Default role: 'user'
    });

    await newUser.save();
    // Generate a JWT token
    const payload = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    };

    const token = jwt.sign(payload, config.key, { expiresIn: "1h" }); // Token valid for 1 hour

    res.status(200).json({
      msg: "User registered successfully",
      token: token,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.route("/update/:email").patch(async (req, res) => {
  try {
    // Find the user by email and update both the password and verified fields
    const result = await User.findOneAndUpdate(
      { email: req.params.email },
      {
        $set: {
          password: req.body.password,
          verified: false, // Reset verified to false
        },
      },
      { new: true } // Return the updated document
    );

    if (!result) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Respond with a success message
    const msg = {
      msg: "Password successfully updated, verification reset!",
      email: req.params.email,
    };
    return res.json(msg);
  } catch (err) {
    // Handle any errors
    return res.status(500).json({ msg: err.message });
  }
});

// router.route("/update/:email").patch(async (req, res) => {
//   //forgot password part...................................
//   try {
//     const result = await User.findOneAndUpdate(
//       { email: req.params.email },
//       { $set: { password: req.body.password } },
//       { new: true } // this option returns the updated document
//     );

//     if (!result) {
//       return res.status(404).json({ msg: "User not found" });
//     }

//     const msg = {
//       msg: "Password successfully updated!",
//       email: req.params.email,
//     };
//     return res.json(msg);
//   } catch (err) {
//     return res.status(500).json({ msg: err.message });
//   }
// });

router
  .route("/delete/:email")
  .delete(middleware.checkToken, async (req, res) => {
    const result = await User.findOneAndDelete({
      email: req.params.email,
    });
    if (!result) {
      return res.status(404).json({ msg: "User not found" });
    }
    const msg = {
      msg: "User has been successfully deleted",
      email: req.params.email,
    };
    return res.json(msg);
  });

const checkAdmin = (req, res, next) => {
  if (req.decoded && req.decoded.role === "admin") {
    next();
  } else {
    return res.status(403).json({ msg: "Access denied" });
  }
};

router.route("/register").post(checkAdmin, async (req, res) => {
  // Registration logic
});

router.route("/updateRole/:email").patch(async (req, res) => {
  try {
    const { role } = req.body;

    // Ensure only valid roles are allowed
    const validRoles = ["user", "customer", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ msg: "Invalid role provided" });
    }

    // Update the user's role
    const result = await User.findOneAndUpdate(
      { email: req.params.email },
      { $set: { role: role } },
      { new: true } // Return the updated document
    );

    if (!result) {
      return res.status(404).json({ msg: "User not found" });
    }

    return res.json({
      msg: "Role updated successfully",
      email: req.params.email,
      role: result.role,
    });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
});
//update the Role of user

// router.route("/all-users").get(middleware.checkToken, async (req, res) => {
//   try {
//     const users = await User.find({}, { username: 1, email: 1, role: 1 });
//     if (!users || users.length === 0) {
//       return res.status(404).json({ status: false, msg: "No users found" });
//     }

//     res.status(200).json({ status: true, users });
//   } catch (err) {
//     console.error("Error fetching users:", err.message);
//     res.status(500).json({ status: false, msg: "Error fetching users" });
//   }
// });

module.exports = router;
