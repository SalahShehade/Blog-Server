const jwt = require("jsonwebtoken"); 
const config = require("./config");

const checkToken = (req, res, next) => {
  let token = req.headers["authorization"];
  
  // 🔥 **Check if token is present**
  if (!token) {
    return res.status(401).json({ 
      status: false, 
      msg: "Token is not provided" 
    });
  }

  // 🔥 **Remove 'Bearer ' from token if present**
  const bearerToken = token.split(' ')[1]; // Dynamically split "Bearer <token>"
  
  // 🔥 **Verify the token**
  jwt.verify(bearerToken, config.key, (error, decoded) => {
    if (error) {
      // 🛠️ Log only for debugging purposes (DO NOT log in production)
      console.warn("❌ Token verification error:", error.message); 

      return res.status(401).json({ 
        status: false, 
        msg: "Invalid or expired token" // Generic message to avoid exposing details 
      });
    }

    // ✅ Attach the user info (decoded) to the `req` object
    req.decoded = decoded; 
    next();
  });
};

module.exports = {
  checkToken: checkToken,
};
