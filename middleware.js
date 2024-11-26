const jwt = require("jsonwebtoken"); // to configure if token is legit
const config = require("./config");

const checkToken = (req, res, next) => {
  let token = req.headers["authorization"];
  console.log(token);

  if (token) {
    token = token.slice(7, token.length); // Ensure the token format is correct
    jwt.verify(token, config.key, (error, decoded) => {
      if (error) {
        // Use 'error' instead of 'err'
        return res.json({
          status: false,
          msg: "Token is invalid",
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res.json({
      status: false,
      msg: "Token is not provided",
    });
  }
};

module.exports = {
  checkToken: checkToken,
};
