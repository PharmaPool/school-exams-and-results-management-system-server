const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const session_schema = new Schema({
  session: { type: String },
  classes: [{ type: Schema.Types.ObjectId, ref: "Class" }],
  current: { type: Boolean, default: false },
  externals: [
    {
      course_code: { type: String },
      course_title: { type: String },
      unit_load: { type: Number },
      semester: { type: Number },
    },
  ],
});

module.exports = mongoose.model("Session", session_schema);
