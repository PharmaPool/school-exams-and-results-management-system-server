const Student = require("../models/student");
const Class = require("../models/class");
const Session = require("../models/session");

const error = require("../utils/error_handler");
const { getIO } = require("../utils/socket");
const { get_gpa, get_cgpa } = require("../utils/gpa");
const {
  get_class,
  get_student,
  get_semester,
  check_student,
  get_student_semester,
  get_student_courses,
  check_course,
  get_course,
  get_class_courses,
  calculateCorrectedUnitLoad,
} = require("../utils/finder");
const {
  get_grade,
  ceutics_grade,
  external_grade,
} = require("../utils/grade_checker");
const bcrypt = require("bcrypt");
const professionals = require("../utils/professionals");

module.exports = (socket) => {
  // Remove registered course
  socket.on("remove_registered_course", async (req) => {
    const course_code = req.course_code;
    const semester = req.semester;
    const current_level = req.level;
    const reg_no = req.reg_no;

    try {
      const student = await Student.findOne({ reg_no });
      if (!student) {
        getIO().emit("error", { action: "invalid student details" });
        return;
      }

      const current_semester = await student.total_courses.find((level) =>
        (level.level === current_level) & (level.semester === semester)
          ? level
          : undefined
      );

      const updated_courses = await current_semester.courses.filter(
        (course) => course.course_code !== course_code
      );

      current_semester.courses = updated_courses;
      await current_semester.save();

      const updated_student = await student.save();

      getIO().emit("remove_registered_course", {
        action: "course removed successfully",
        updated_student,
      });
    } catch (err) {
      error.error(err, next);
    }
  });

  // Get class
  socket.on("class", async (req) => {
    const class_id = req.class_id;
    const semester = req.semester;

    try {
      const current_class = await get_class(class_id);
      const current_semester = await get_semester(current_class, semester);
      // const current_semester_students = await current_semester
      current_semester.sort(function (a, b) {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });

      socket.emit("class", {
        message: "class fetched successfully",
        current_semester,
      });
    } catch (err) {
      getIO().emit("error", { action: "an error occurred", err });
    }
  });

  // Search student
  socket.on("search_student", async (req) => {
    const reg_no = req.reg_no;

    try {
      const student = await Student.find({
        $or: [{ reg_no: { $regex: reg_no, $options: "i" } }],
      });

      if (!student) {
        getIO().emit("error", { action: "student not found" });
        return;
      }

      getIO().emit("search", { action: "search_result", student });
    } catch (err) {
      getIO().emit("error", { action: "search error", err });
    }
  });

  socket.on("add_score", async (req) => {
    const reg_no = req.reg_no;
    const session = req.session;
    const semester = req.semester;
    const course_code = req.course_code;
    const exam = req.exam;
    const ca = req.ca;

    try {
      const student = await Student.findOne({ reg_no });
      if (!student) {
        getIO().emit("error", { action: "student does not exist" });
        return;
      }

      const current_semester = await get_student_semester(
        student,
        session,
        semester
      );
      const courses = await get_student_courses(current_semester);
      const course = await get_course(courses, course_code);

      course.ca = Number(ca);
      course.exam = Number(exam);
      course.total = Number(exam) + Number(ca);
      if (course_code === "pct222" || course_code === "pct422") {
        course.grade = await ceutics_grade(Number(exam) + Number(ca));
      } else if (course_code in professionals) {
        course.grade = await get_grade(Number(exam) + Number(ca));
      } else {
        course.grade = await external_grade(Number(exam) + Number(ca));
      }

      const gpa = await get_gpa(current_semester);
      const cgpa = await get_cgpa(student.total_semesters);

      current_semester.gpa = gpa;
      student.cgpa = cgpa;
      await student.save();

      const students = await Student.find({
        total_semesters: {
          $elemMatch: {
            session,
            semester: Number(semester),
            courses: {
              $elemMatch: {
                course_code,
              },
            },
          },
        },
      });

      socket.emit("students", { message: "score saved", students });
    } catch (err) {
      getIO().emit("error", { message: "an error occurred", err });
    }
  });
};

module.exports.get_course_student = async (req, res, next) => {
  const course_code = req.params.code;
  const semester = req.params.semester;
  const session = req.params.session;

  try {
    const students = await Student.find({
      total_semesters: {
        $elemMatch: {
          session,
          semester: Number(semester),
          courses: {
            $elemMatch: {
              course_code,
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "students fetched successfully",
      students,
    });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.register_students = async (req, res, next) => {
  const fullname = req.body.fullname;
  const reg_no = req.body.reg_no;
  const level = req.body.level;
  const course_title = req.body.course_title;
  const course_code = req.body.course_code;
  const unit_load = req.body.unit_load;
  const semester = req.body.semester;
  const session = req.body.session;
  const class_id = req.body.class_id;
  const external = req.body.external;

  try {
    const current_session = await Session.findOne({ session });

    let student = await get_student(reg_no);
    if (!student) {
      const hashed_password = await bcrypt.hash(reg_no, 12);

      // Add new student with the course and corrected unit load
      student = new Student({
        fullname,
        reg_no,
        password: hashed_password,
        level,
        total_semesters: [
          {
            session,
            level,
            semester,
            courses: [
              {
                course_code,
                course_title,
                unit_load,
                corrected_unit_load: unit_load,
                external,
              },
            ],
          },
        ],
      });
      await student.save();
    } else {
      const current_semester = await get_student_semester(
        student,
        session,
        semester
      );

      if (!current_semester) {
        // Add a new semester for the student
        await student.total_semesters.push({
          session,
          level,
          semester,
          courses: [
            {
              course_code,
              course_title,
              unit_load,
              corrected_unit_load: calculateCorrectedUnitLoad(
                student.total_semesters,
                course_code,
                unit_load
              ),
              external,
            },
          ],
        });
        student.level = level;
        await student.save();
      } else {
        // Add course to an existing semester
        const courses = await get_student_courses(current_semester);
        const course = await check_course(courses, course_code);

        if (!course) {
          await courses.push({
            course_code,
            course_title,
            unit_load,
            corrected_unit_load: calculateCorrectedUnitLoad(
              student.total_semesters,
              course_code,
              unit_load
            ),
            external,
          });
          await student.save();
        }
      }
    }

    if (external) {
      await current_session.externals.push({
        course_code,
        course_title,
        unit_load,
        semester,
      });
      await current_session.save();
    }

    const current_clas = await get_class(class_id);
    const current_sem = await get_semester(current_clas, semester);
    const student_check = await check_student(
      student._id.toString(),
      current_sem
    );
    if (!student_check) {
      await current_sem.push(student._id);
      await current_clas.save();
    }

    const current_class = await get_class(class_id);
    const current_semester = await get_semester(current_class, semester);
    current_semester.sort(function (a, b) {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });

    res.status(200).json({
      message: "Student registered successfully",
      current_semester,
    });
  } catch (err) {
    console.log(err);
  }
};

module.exports.add_score = async (req, res, next) => {
  const reg_no = req.body.reg_no;
  const session = req.body.session;
  const semester = req.body.semester;
  const course_code = req.body.course_code;
  const exam = req.body.exam;
  const ca = req.body.ca;

  try {
    const student = await Student.findOne({ reg_no });
    if (!student) {
      getIO().emit("error", { action: "student does not exist" });
      return;
    }

    const current_semester = await get_student_semester(
      student,
      session,
      semester
    );
    const courses = await get_student_courses(current_semester);
    const course = await get_course(courses, course_code);

    // Update course scores
    course.ca = Number(ca);
    course.exam = Number(exam);
    course.total = Number(exam) + Number(ca);
    if (course_code === "pct222" || course_code === "pct422") {
      course.grade = await ceutics_grade(Number(exam) + Number(ca));
    } else if (course_code in professionals) {
      course.grade = await get_grade(Number(exam) + Number(ca));
    } else {
      course.grade = await external_grade(Number(exam) + Number(ca));
    }

    // Update GPA and CGPA
    const gpa = await get_gpa(current_semester);
    const cgpa = await get_cgpa(student.total_semesters);

    current_semester.gpa = gpa;
    student.cgpa = cgpa;

    // Calculate and update session GPA
    const sessionSemesters = student.total_semesters.filter(
      (sem) => sem.session === session
    );

    let totalPoints = 0;
    let totalUnits = 0;

    sessionSemesters.forEach((sem) => {
      sem.courses.forEach((course) => {
        if (course.grade !== undefined && course.unit_load > 0) {
          totalPoints += course.grade * course.unit_load;
          totalUnits += course.unit_load;
        }
      });
    });

    const sessionGPA = totalUnits > 0 ? totalPoints / totalUnits : 0;

    const existingSessionIndex = student.session_cgpa.findIndex(
      (entry) => entry.session === session
    );

    if (existingSessionIndex !== -1) {
      student.session_cgpa[existingSessionIndex].cgpa = sessionGPA.toFixed(2);
    } else {
      student.session_cgpa.push({
        session,
        cgpa: sessionGPA.toFixed(2),
      });
    }

    // Save the updated student document
    await student.save();

    // Get all students for the session and semester for response
    const students = await Student.find({
      total_semesters: {
        $elemMatch: {
          session,
          semester: Number(semester),
          courses: {
            $elemMatch: {
              course_code,
            },
          },
        },
      },
    });

    res.status(200).json({ message: "score saved", students });
  } catch (err) {
    error.error(err, next);
  }
};
