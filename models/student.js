const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const student_schema = new Schema({
  verified: { type: Boolean, default: false },
  fullname: { type: String, require: [true, "name should not be empty"] },
  email: { type: String },
  profile_image: {
    type: String,
    default:
      "https://res.cloudinary.com/muyi-hira-app/image/upload/v1733406309/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration_lp8qko.jpg",
  },
  reg_no: { type: String, require: [true, "reg number in invalid"] },
  password: { type: String, require: [true, "password is required"] },
  level: { type: Number },
  total_semesters: [
    {
      session: { type: String },
      level: { type: Number },
      semester: { type: Number },
      gpa: { type: Number },
      courses: [
        {
          course_code: { type: String },
          course_title: { type: String },
          unit_load: { type: Number, default: 0 },
          corrected_unit_load: { type: Number, default: 0 },
          ca: { type: Number, default: 0 },
          exam: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
          grade: { type: Number, default: 0 },
          external: { type: Boolean, default: false },
        },
      ],
      published: { type: Boolean, default: false },
    },
  ],
  cgpa: { type: Number, default: 0 },
  session_cgpa: [{ session: { type: String }, cgpa: { type: Number } }],
});

module.exports = mongoose.model("Student", student_schema);
