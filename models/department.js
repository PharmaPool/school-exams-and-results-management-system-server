const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const department_schema = new Schema({
  department: { type: String },
  password: { type: String },
});

module.exports = mongoose.model("Department", department_schema);
