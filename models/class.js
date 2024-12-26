const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const class_schema = new Schema({
  level: { type: String },
  semesters: {
    first: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    second: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  },
  courses: {
    first: [{ type: String }],
    second: [{ type: String }],
  },
});

module.exports = mongoose.model("Class", class_schema);
