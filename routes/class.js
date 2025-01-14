const express = require("express");
const router = express.Router();

const class_controller = require("../controllers/class");

router.get(
  "/course/:session/:semester/:code",
  class_controller.get_course_student
);
router.get(
  "/:session/:prev_session/:level",
  class_controller.get_error_students
);
router.post("/course/register", class_controller.register_students);
router.post("/course/score", class_controller.add_score);

module.exports = router;
