module.exports = {
  get_gpa: async (semester) => {
    let total_score = 0,
      total_units = 0;

    await semester.courses.map((course) => {
      total_score += course.grade * course.unit_load;
      total_units += course.corrected_unit_load;
    });

    const gpa = total_score / total_units;

    return gpa.toFixed(2);
  },
  get_session_gpa: async (first_semester, second_semester) => {
    let total_score = 0,
    total_units = 0;
    
    await first_semester.courses.map((course) => {
      total_score += course.grade * course.unit_load;
      total_units += course.corrected_unit_load;
    });
    
    await second_semester.courses.map((course) => {
      total_score += course.grade * course.unit_load;
      total_units += course.corrected_unit_load;
    });

    const gpa = total_score / total_units;

    return gpa.toFixed(2);
  },
  get_cgpa: async (total_courses) => {
    let total_score = 0,
      total_units = 0;

    await total_courses.map((semester) =>
      semester.courses.map((course) => {
        total_score += course.grade * course.unit_load;
        total_units += course.corrected_unit_load;
      })
    );

    const cgpa = total_score / total_units;

    return cgpa.toFixed(2);
  },
};
