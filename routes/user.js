const express = require("express");
const User = require("../models/user.model");
const config = require("../config");
const jwt = require("jsonwebtoken");
const middleware = require("../middleware");

const router = express.Router();

router.get("/searchName/:email", async (req, res) => {
  try {
    const { email } = req.params; // Extract email from the route parameter

    // Perform case-insensitive search for users with matching email or username
    const users = await User.find({
      email: { $regex: email, $options: "i" }, // Case-insensitive search by email
    });

    if (users.length === 0) {
      return res
        .status(404)
        .json({ msg: "No users found matching the search query" });
    }

    const usernames = users.map((user) => user.username); // Extract usernames
    res.status(200).json({ usernames });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Error searching for users", error: error.message });
  }
});

// Search users by username and filter by role (only 'user' and 'customer')
router.get("/search/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Perform case-insensitive search using regex
    const users = await User.find({
      username: { $regex: username, $options: "i" }, // Case-insensitive search for username
      role: { $in: ["user", "customer"] }, // Filter only 'user' and 'customer' roles
    });

    if (users.length === 0) {
      return res
        .status(404)
        .json({ msg: "No users found matching the search query" });
    }

    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Error searching for users", error: error.message });
  }
});

// Add this route to fetch all admin emails
router.get("/getAdmins", async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }, "email"); // Fetch only admins and their emails
    const adminEmails = admins.map((admin) => admin.email);
    res.status(200).json({ adminEmails });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch admin emails.", error: err.message });
  }
});

// router.get("/customers", async (req, res) => {
//   try {
//     // ⭐️ Find users where role is 'customer'
//     const customers = await User.find({ role: "customer" }).select("-password");

//     if (!customers || customers.length === 0) {
//       return res.status(404).json({ msg: "No customers found" }); // ⭐️ Return 404 if no customers
//     }

//     res.status(200).json(customers); // ⭐️ Return the list of customers
//   } catch (error) {
//     console.error("Error fetching customers:", error); // Log error
//     res.status(500).json({ msg: "Server error" }); // Return generic server error
//   }
// });

// Route to get all customers with their profile images
router.get("/customers", middleware.checkToken, async (req, res) => {
  try {
    // ⭐️ Aggregation Pipeline to join User and Profile collections
    const customers = await User.aggregate([
      {
        // Match users with role 'customer'
        $match: { role: "customer" },
      },
      {
        // Lookup corresponding profile based on email
        $lookup: {
          from: "profiles", // Name of the Profile collection in MongoDB
          localField: "email",
          foreignField: "email",
          as: "profile",
        },
      },
      {
        // Unwind the profile array to simplify the structure
        $unwind: {
          path: "$profile",
          preserveNullAndEmptyArrays: true, // Keeps users even if they don't have a profile
        },
      },
      {
        // Project the desired fields
        $project: {
          password: 0, // Exclude password
          "profile._id": 0, // Exclude internal profile fields if necessary
          "profile.__v": 0,
          // Include other profile fields as needed
        },
      },
    ]);

    if (!customers || customers.length === 0) {
      return res.status(404).json({ msg: "No customers found" });
    }

    res.status(200).json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});
router.get("/getUserName", middleware.checkToken, async (req, res) => {
  try {
    const email = req.decoded.email; // Extract email from the decoded JWT
    if (!email) {
      return res.status(400).json({ message: "Email not found in token" });
    }

    const user = await User.findOne({ email: email }, "username email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ username: user.username, email: user.email });
  } catch (error) {
    res.status(500).json({ message: "Failed to get username", error });
  }
});

router.route("/ban/:email").patch(async (req, res) => {
  const email = req.params.email;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Toggle the ban status
    user.isBanned = !user.isBanned;

    await user.save();

    res.status(200).json({
      Status: true,
      message: `User has been ${
        user.isBanned ? "banned" : "unbanned"
      } successfully.`,
      isBanned: user.isBanned,
    });
  } catch (error) {
    res.status(500).json({
      Status: false,
      message: "Failed to update user status.",
      error,
    });
  }
});

router.route("/getUsers").get(middleware.checkToken, async (req, res) => {
  try {
    const { role } = req.decoded; // Assuming the role is stored in the decoded JWT

    if (role === "admin") {
      // Fetch only users and customers
      const response = await User.find(
        { role: { $in: ["user", "customer"] } }, // Include only users with roles 'user' or 'customer'
        "email username role isBanned" // Include only these fields
      );

      console.log("Filtered Users:", response); // Log filtered response

      if (!response || response.length === 0) {
        return res.status(404).json({ message: "No users or customers found" });
      }

      return res.json({ data: response });
    } else {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
});

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

    // Check if the user is banned
    if (result.isBanned) {
      return res
        .status(403)
        .json({ message: "Your account has been banned. Contact support." });
    }

    if (result.password === req.body.password) {
      // Include the role in the JWT payload
      const token = jwt.sign(
        {
          email: result.email,
          role: result.role, // Include the user's role
          profileFlag: result.profileFlag, // Include the profileFlag
        },
        config.key,
        {
          // expiresIn: "24h", // Token expires in 24 hours
        }
      );

      return res.json({
        token: token,
        role: result.role,
        profileFlag: result.profileFlag, // Send profileFlag to frontend
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

router.route("/verifyToFalse/:email").post(async (req, res) => {
  try {
    const email = req.params.email;
    const result = await User.findOneAndUpdate(
      { email },
      { $set: { verified: false } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ msg: "User not found" });
    }

    return res.status(200).json({
      msg: "User verification has been set to false",
      user: result,
    });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
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

module.exports = router;
