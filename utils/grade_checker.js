module.exports = {
  get_grade: (score) => {
    if (score >= 70) return 5;
    else if (score < 70 && score >= 60) return 4;
    else if (score < 60 && score >= 50) return 3;
    else return 0;
  },
  external_grade: (score) => {
    if (score >= 70) return 5;
    else if (score < 70 && score >= 60) return 4;
    else if (score < 60 && score >= 50) return 3;
    else if (score < 50 && score >= 45) return 2;
    else if (score < 45 && score >= 40) return 1;
    else return 0;
  },
  ceutics_grade: (score) => {
    if (score >= 70) return 5;
    else if (score < 70 && score >= 60) return 4;
    else return 0;
  },
};
