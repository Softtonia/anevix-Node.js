const crypto = require("crypto");

const generateOTP = () => {
  return crypto.randomInt(100000, 10000000).toString();
};

module.exports = generateOTP;