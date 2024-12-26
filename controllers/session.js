const Session = require("../models/session");

const error = require("../utils/error_handler");

module.exports.get_sessions = async (req, res, next) => {
  try {
    const sessions = await Session.find().populate("classes");
    // .populate({
    //   path: "classes", // Populate the classes array
    //   populate: {
    //     path: `semesters.first`, // Populate students in the specified semester
    //     model: "Student",
    //   },
    // })
    // .populate({
    //   path: "classes", // Populate the classes array
    //   populate: {
    //     path: `semesters.second`, // Populate students in the specified semester
    //     model: "Student",
    //   },
    // })
    // .exec();

    res.status(200).json({
      success: true,
      message: "all sessions fetched successfully",
      sessions,
    });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.get_session = async (req, res, next) => {
  const session_id = req.params.session_id;

  try {
    const current_session = await Session.findById(session_id);
    if (!current_session) {
      error.errorHandler(res, "session not found", "session");
      return;
    }

    res.status(200).json({
      success: true,
      message: "session fetched successfully",
      current_session,
    });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.remove_session = async (req, res, next) => {
  const session_id = req.body.session_id;

  try {
    await Session.findByIdAndDelete(session_id);

    res
      .status(200)
      .json({ success: true, message: "session removed successfully" });
  } catch (err) {
    error.error(err, next);
  }
};
