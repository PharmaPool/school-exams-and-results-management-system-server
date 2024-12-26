// const jwt = require("jsonwebtoken");
const OTP = require("../models/otp");
const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  generate_otp: async () => {
    function generateCode(length, chars) {
      let result = "";
      for (var i = length; i > 0; --i)
        result += chars[Math.floor(Math.random() * chars.length)];
      return result;
    }
    let code = generateCode(
      6,
      "abcdefghijklm0123456789nopqrstuvwxyz0123456789ABCDEFGHIJKLM0123456789NOPQRSTUVWXYZ"
    );

    const otp = new OTP({ code });
    await otp.save();

    return code;
  },
  generateId: () => {
    function randomString(length, chars) {
      let result = "";
      for (var i = length; i > 0; --i)
        result += chars[Math.floor(Math.random() * chars.length)];
      return result;
    }
    let code = randomString(
      6,
      "abcdefghijklm0123456789nopqrstuvwxyz0123456789ABCDEFGHIJKLM0123456789NOPQRSTUVWXYZ"
    );
    return code;
  },
  verify_otp: async (code) => {
    const otp = await OTP.findOne({ code });
    if (!otp) return false;
    await OTP.findOneAndDelete({ code });
    return true;
  },
};
