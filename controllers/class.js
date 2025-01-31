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
    if (course_code === "pct224" || course_code === "pct422") {
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

module.exports.get_error_students = async (req, res, next) => {
  const cur_session = req.params.session,
    prev_session = req.params.prev_session,
    level = req.params.level;

  try {
    const current_session = await Session.findOne({
      session: cur_session,
    }).populate("classes");
    const previous_session = await Session.findOne({
      session: prev_session,
    }).populate("classes");

    const current_level = current_session.classes.find(
      (lev) => lev.level == level
    ).semesters.second;
    const previous_level = previous_session.classes.find(
      (lev) => lev.level == Number(level) - 100
    ).semesters.second;

    res.status(200).json({ current_level, previous_level });
  } catch (error) {
    console.log(error);
  }
};

const approximateScores = async () => {
  try {
    // Fetch all students
    const students = await Student.find();

    for (const student of students) {
      // Iterate through each semester
      for (const semester of student.total_semesters) {
        for (const course of semester.courses) {
          if (
            course.course_code === "pct224" ||
            course.course_code === "pct422"
          ) {
            course.grade = ceutics_grade(course.total);
          } else if (course.course_code in professionals) {
            course.grade = get_grade(course.total);
          } else {
            course.grade = external_grade(course.total);
          }
        }
      }
      await student.save();
      console.log(`Scores approximated successfully for ${student.reg_no}`);
    }

    console.log("Scores approximated successfully for all eligible courses.");
  } catch (err) {
    console.error("Error approximating scores:", err);
  }
};

// Call the function
// approximateScores();

const calculateSessionGPAWithLevel = async (session) => {
  try {
    // Fetch all students
    const students = await Student.find();

    for (const student of students) {
      // Find all semesters for the given session
      const sessionSemesters = student.total_semesters.filter(
        (semester) => semester.session === session
      );

      if (sessionSemesters.length > 0) {
        let totalWeightedScore = 0;
        let totalUnitLoad = 0;

        // Extract the level from the first semester of the session
        const sessionLevel = sessionSemesters[0].level;

        // Loop through each semester to calculate GPA
        for (const semester of sessionSemesters) {
          for (const course of semester.courses) {
            const unitLoad = course.corrected_unit_load || course.unit_load;
            totalWeightedScore += course.grade * unitLoad;
            totalUnitLoad += unitLoad;
          }
        }

        // Calculate session GPA
        const sessionGPA =
          totalUnitLoad > 0 ? totalWeightedScore / totalUnitLoad : 0;

        // Check if the session GPA already exists
        const existingSessionGPA = student.session_cgpa.find(
          (entry) => entry.session === session
        );

        if (existingSessionGPA) {
          // Update existing entry
          existingSessionGPA.cgpa = sessionGPA.toFixed(2);
          existingSessionGPA.level = sessionLevel;
        } else {
          // Add new entry
          student.session_cgpa.push({
            session,
            cgpa: sessionGPA.toFixed(2),
            level: sessionLevel,
          });
        }

        // Save updated student record
        await student.save();
      }
    }

    console.log("Session GPA with levels calculated for all students.");
  } catch (err) {
    console.error("Error calculating session GPA with levels:", err);
  }
};

// Example usage
// calculateSessionGPAWithLevel("2022-2023");

const calculateCGPA = async () => {
  try {
    const students = await Student.find();

    for (const student of students) {
      let totalScore = 0;
      let totalUnits = 0;

      for (const semester of student.total_semesters) {
        for (const course of semester.courses) {
          totalScore += course.grade * course.unit_load; // Calculate weighted score
          totalUnits += course.unit_load; // Accumulate total unit load
        }
      }

      const cgpa = totalUnits > 0 ? totalScore / totalUnits : 0; // Avoid division by zero
      student.cgpa = cgpa.toFixed(2); // Save CGPA rounded to 2 decimal places
      await student.save();
      console.log(`cgpa of ${student.fullname} updated!`);
    }

    console.log("CGPA calculated and updated for all students.");
  } catch (err) {
    console.error("Error calculating CGPA:", err);
  }
};

// Call the function
// calculateCGPA();

const calculateStudentSessionalGPA = async (reg_no, session) => {
  try {
    // Fetch the student by registration number
    const student = await Student.findOne({ reg_no });

    if (!student) {
      console.error("Student not found");
      return;
    }

    // Get all semesters for the specified session
    const semestersInSession = student.total_semesters.filter(
      (semester) => semester.session === session
    );

    if (semestersInSession.length === 0) {
      console.error("No semesters found for the specified session");
      return;
    }

    let totalScore = 0;
    let totalUnits = 0;
    const sessionLevel = semestersInSession[0].level; // Take the level from the first semester

    // Calculate the total score and unit load
    semestersInSession.forEach((semester) => {
      semester.courses.forEach((course) => {
        totalScore += course.grade * course.unit_load;
        totalUnits += course.unit_load;
      });
    });

    // Compute the SGPA
    const sgpa = totalUnits > 0 ? totalScore / totalUnits : 0;

    // Check if the sessional GPA already exists in session_cgpa
    const existingSession = student.session_cgpa.find(
      (entry) => entry.session === session
    );

    if (existingSession) {
      // Update the SGPA and level
      existingSession.cgpa = sgpa.toFixed(2);
      existingSession.level = sessionLevel;
    } else {
      // Add a new entry for the SGPA
      student.session_cgpa.push({
        session,
        cgpa: sgpa.toFixed(2),
        level: sessionLevel,
      });
    }

    // Save the updated student record
    await student.save();

    console.log(
      `Sessional GPA for session ${session} updated:`,
      sgpa.toFixed(2)
    );
    return sgpa.toFixed(2);
  } catch (err) {
    console.error("Error calculating Sessional GPA:", err);
  }
};

// Example Usage
// calculateStudentSessionalGPA("2020/249336", "2022-2023");

const calculateSemesterGPAForAllStudents = async () => {
  try {
    // Fetch all students
    const students = await Student.find();

    if (!students || students.length === 0) {
      console.log("No students found.");
      return;
    }

    // Loop through all students
    for (const student of students) {
      let updated = false; // Track if any semester's GPA is updated

      // Loop through all semesters for the student
      for (const semester of student.total_semesters) {
        let totalScore = 0;
        let totalUnits = 0;

        // Calculate GPA for the current semester
        semester.courses.forEach((course) => {
          totalScore += course.grade * course.unit_load;
          totalUnits += course.unit_load;
        });

        // Calculate GPA and update the semester object
        const gpa = totalUnits > 0 ? totalScore / totalUnits : 0;
        if (semester.gpa !== gpa.toFixed(2)) {
          semester.gpa = gpa.toFixed(2); // Update the GPA
          updated = true;
        }
      }

      // Save the student only if any semester GPA was updated
      if (updated) {
        await student.save();
        console.log(`Updated semester GPA for student: ${student.reg_no}`);
      }
    }

    console.log("Semester GPA calculation for all students completed.");
  } catch (err) {
    console.error("Error calculating semester GPA:", err);
  }
};

// Execute the function
// calculateSemesterGPAForAllStudents();
