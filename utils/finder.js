const Student = require("../models/student");
const Class = require("../models/class");

module.exports = {
  get_class: async (class_id) => {
    const current_class = await Class.findById(class_id)
      .populate("semesters.first")
      .populate("semesters.second");
    if (current_class) return current_class;
    else return null;
  },
  get_student: async (reg_no) => {
    const student = await Student.findOne({ reg_no });
    if (!student) return null;
    else return student;
  },
  get_semester: async (current_class, semester) => {
    if (semester == "1") return current_class.semesters.first;
    else return current_class.semesters.second;
  },
  check_student: async (student_id, current_class) => {
    const student = await current_class.filter(
      (current_student) => current_student._id.toString() === student_id
    );
    if (student.length > 0) return true;
    else return false;
  },
  get_student_semester: async (student, session, semester) => {
    if (student) {
      const current_semester = await student.total_semesters.find(
        (sem) => sem.session === session && sem.semester === Number(semester)
      );
      if (current_semester) return current_semester;
      else return null;
    }
  },
  get_student_courses: async (current_semester) => {
    if (current_semester) return current_semester.courses;
    else return null;
  },
  check_course: async (courses, course_code) => {
    if (courses) {
      const course = await courses.find(
        (single_course) => single_course.course_code === course_code
      );
      if (course) return true;
      else return false;
    }
  },
  get_course: async (courses, course_code) => {
    if (courses) {
      const course = await courses.find(
        (single_course) => single_course.course_code === course_code
      );
      if (course) return course;
      else return false;
    }
  },
  get_session: async (total_semesters, session) => {
    const current_session = await total_semesters.filter(
      (semester) => semester.session === session
    );
    if (current_session.length > 0) return current_session;
    else return null;
  },
  get_class_courses: async (current_class, semester) =>
    semester == 1 ? current_class.first : current_class.second,

  calculateCorrectedUnitLoad: (total_semesters, course_code, unit_load) => {
    for (const semester of total_semesters) {
      for (const course of semester.courses) {
        if (course.course_code === course_code) {
          // If course is found in previous semesters, it's a carryover
          return unit_load * 2;
        }
      }
    }
    // If course is not found in previous semesters, return original unit load
    return unit_load;
  },
};
