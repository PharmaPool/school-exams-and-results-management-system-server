const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const admin_schema = new Schema({
  email: { type: String, default: "wilsonzim566@gmail.com" },
  passkey: { type: String },
  departments: [{ department: { type: String }, password: { type: String } }],
});

module.exports = mongoose.model("Admin", admin_schema);
