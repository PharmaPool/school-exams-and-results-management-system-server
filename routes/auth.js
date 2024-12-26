const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth_controller = require("../controllers/auth");

const upload = multer({ dest: "../uploads" });

router.get("/admin/signup", auth_controller.admin_signup);
router.get("/admin/passkey", auth_controller.admin_passkey_request);
router.post("/admin/signin/:otp", auth_controller.admin_signin);
router.post("/student/login", auth_controller.student_login);
router.get("/student/code/:email", auth_controller.get_student_code);
router.post(
  "/student/details/update/:_id",
  upload.single("file"),
  auth_controller.student_profile_update
);
router.post("/student/passwordreset", auth_controller.student_profile_update);
router.post("/session", auth_controller.register_session);

module.exports = router;
