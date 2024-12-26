const Student = require("../models/student");

const { getIO } = require("../utils/socket");
const { get_session } = require("../utils/finder");
const { get_session_gpa } = require("../utils/gpa");
const error = require("../utils/error_handler");

module.exports = (socket) => {
  socket.on("student", async (req) => {
    const student_id = req._id;

    try {
      const student = await Student.findById(student_id);
      if (!student) {
        getIO().emit("error", { message: "student not found" });
        return;
      }

      getIO().emit("student", {
        message: "student fetched successfully",
        student,
      });
    } catch (err) {
      getIO().emit("error", { message: "an error occurred" });
    }
  });

  socket.on("transcript", async (req) => {
    const student_id = req._id;
    const session = req.sesion;

    try {
      const student = await Student.findById(student_id);
      if (!student) {
        getIO().emit("error", { message: "student not found" });
        return;
      }

      const current_session = await get_session(
        student.total_semesters,
        session
      );

      const session_gpa = await get_session_gpa(
        current_session[0],
        current_session[1]
      );

      getIO().emit("transcript", {
        message: "student fetched successfully",
        student,
        session_gpa,
      });
    } catch (err) {
      getIO().emit("error", { message: "an error occurred" });
    }
  });
};
