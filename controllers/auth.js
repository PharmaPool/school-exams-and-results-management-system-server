const Admin = require("../models/admin");
const Student = require("../models/student");
const Class = require("../models/class");
const Session = require("../models/session");
const Department = require("../models/department");

const error = require("../utils/error_handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { generate_otp, verify_otp } = require("../utils/otp");
const nodemailer = require("../utils/nodemailer");
const { uploadImage } = require("../utils/image");

dotenv.config();

module.exports.admin_signup = async (req, res, next) => {
  const email = "wilsonzim566@gmail.com";

  try {
    const admin = await Admin.findOne({ email });
    if (admin) {
      error.errorHandler(res, "admin already registered", "admin");
      return;
    }

    const new_admin = new Admin({ email });
    await new_admin.save();

    res
      .status(200)
      .json({ success: true, message: "admin registered successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.admin_passkey_request = async (req, res, next) => {
  const email = "wilsonzim566@gmail.com";
  try {
    const admin = await Admin.find({ email });
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    const code = await generate_otp();
    await nodemailer(
      email,
      "Admin OTP",
      "Use this One Time Password for your login.",
      code
    );

    res
      .status(200)
      .json({ success: true, message: `An email has been sent to ${email}.` });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.admin_signin = async (req, res, next) => {
  const email = "wilsonzim566@gmail.com";
  const passkey = req.params.otp;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    const verified_otp = await verify_otp(passkey);
    if (!verified_otp) {
      error.errorHandler(res, "invalid passkey", "res");
      return;
    }

    // Create jsonwebtoken
    const token = jwt.sign({ admin, email }, process.env.jwtKey, {
      algorithm: "HS256",
      expiresIn: process.env.jwtExpirySeconds,
    });

    res
      .status(200)
      .json({ success: true, message: "signin successful", token });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.student_login = async (req, res, next) => {
  const reg_no = req.body.reg_no,
    password = req.body.password;

  try {
    const student = await Student.findOne({ reg_no });
    if (!student) {
      error.errorHandler(res, "student not found", "student ");
      return;
    }

    const password_match = await bcrypt.compare(password, student.password);
    if (!password_match) {
      error.errorHandler(res, "invalid password", "password");
      return;
    }

    res
      .status(200)
      .json({ success: true, message: "login successful", student });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.get_student_code = async (req, res, next) => {
  const email = req.params.email;

  try {
    const code = await generate_otp();
    await nodemailer(
      email,
      "Admin OTP",
      "Use this One Time Password for your login.",
      code
    );

    res
      .status(200)
      .json({ success: true, message: `An email has been sent to ${email}.` });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.student_password_reset = async (req, res, next) => {
  const reg_no = req.body.reg_no;
  const password = req.body.password;

  try {
    const student = await Student.findOne({ reg_no });
    if (!student) {
      error.errorHandler(res, "invalid details", "student");
      return;
    }

    const hashed_password = await bcrypt.hash(password, 12);
    student.password = hashed_password;

    await student.save();

    res
      .status(200)
      .json({ success: true, message: "details updated successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.student_profile_update = async (req, res, next) => {
  const student_id = req.params._id;
  const email = req.body.email;
  const password = req.body.password;
  let image_url;

  console.log(req.body)

  try {
    const student = await Student.findById(student_id);
    if (!student) {
      error.errorHandler(res, "invalid details", "student");
      return;
    }

    if (req.file) {
      image_url = await uploadImage(res, req.file.path);
    }

    const hashed_password = await bcrypt.hash(password, 12);

    student.email = email;
    student.profile_image = image_url;
    student.password = hashed_password;
    student.verified = true;

    await student.save();

    res
      .status(200)
      .json({
        success: true,
        message: "details updated successfully",
        student,
      });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.register_session = async (req, res, next) => {
  const current_session = req.body.session;
  const current = req.body.current;
  const levels = [100, 200, 300, 400, 500, 600];

  try {
    const session = await Session.findOne({ session: current_session });
    if (session) {
      error.errorHandler(res, "session already registered", "session");
      return;
    }

    if (current) {
      const prev_current_session = await Session.findOne({ current: true });
      if (prev_current_session) {
        prev_current_session.current = false;
        prev_current_session.save();
      }
    }

    const new_session = new Session({ session: current_session, current });

    for (const current_level of levels) {
      const level = new Class({ level: current_level });
      const new_level = await level.save();

      new_session.classes.push(new_level);
    }
    const registered_session = await new_session.save();

    res.status(200).json({
      success: true,
      message: "session registered successfully",
      registered_session,
    });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.register_department = async (req, res, next) => {
  const department_title = req.body.department_title;
  const password = req.body.password;

  try {
    const hashed_password = await bcrypt.hash(password, 12);

    const department = new Department({
      department: department_title,
      password: hashed_password,
    });

    await department.save();

    res
      .status(200)
      .json({ success: true, message: "department registered successfully" });
  } catch (err) {
    error.error(err, next);
  }
};
