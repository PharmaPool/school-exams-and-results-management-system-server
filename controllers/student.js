const Student = require("../models/student");
const cloudinary = require("cloudinary").v2;

const { getIO } = require("../utils/socket");
const { get_session } = require("../utils/finder");
const { get_session_gpa } = require("../utils/gpa");
const error = require("../utils/error_handler");

// Configuration
cloudinary.config({
  cloud_name: "dobsgzbhk",
  api_key: "744973231822537",
  api_secret: "F_kT-dg2WEM-9Aaj2i9dyfwipa4", // Click 'View API Keys' above to copy your API secret
});

const fetchImages = async () => {
  const data = await cloudinary.search.expression("folder=200").execute();
  console.log(data.resources.map((file) => file.url).length);
};

// fetchImages();

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
            const unitLoad = course.unit_load;
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

const calculateSessionalGPA = async () => {
  try {
    // Fetch all students from the database
    const students = await Student.find();

    for (const student of students) {
      const sessions = {}; // To group semesters by session

      // Group semesters by session
      student.total_semesters.forEach((semester) => {
        if (!sessions[semester.session]) {
          sessions[semester.session] = [];
        }
        sessions[semester.session].push(semester);
      });

      for (const [session, semesters] of Object.entries(sessions)) {
        let totalScore = 0;
        let totalUnits = 0;
        let sessionLevel = semesters[0].level; // Use the level from the first semester in the session

        // Calculate the total score and units for the session
        semesters.forEach((semester) => {
          semester.courses.forEach((course) => {
            totalScore += course.grade * course.unit_load;
            totalUnits += course.unit_load;
          });
        });

        // Compute the Sessional GPA
        const sgpa = totalUnits > 0 ? totalScore / totalUnits : 0;

        // Check if the sessional GPA already exists in session_cgpa
        const existingSession = student.session_cgpa.find(
          (entry) => entry.session === session
        );

        if (existingSession) {
          // Update the sessional GPA and level
          existingSession.cgpa = sgpa.toFixed(2);
          existingSession.level = sessionLevel;
        } else {
          // Add a new sessional GPA entry
          student.session_cgpa.push({
            session,
            cgpa: sgpa.toFixed(2),
            level: sessionLevel,
          });
        }
      }

      // Save the updated student document
      await student.save();
      console.log(`done with ${student.fullname}`);
    }

    console.log("Sessional GPA calculated and updated for all students.");
  } catch (err) {
    console.error("Error calculating Sessional GPA:", err);
  }
};

// Call the function
// calculateSessionalGPA();
