const { pool } = require('./db');

async function completeUserTest() {
  const interviewId = 'int-dpujzs9ju';
  const dummyReport = {
    overallScore: 85,
    passingScore: 70,
    passingStatus: "Passed",
    introScore: 85,
    commScore: 88,
    confScore: 90,
    presentScore: 85,
    nightShiftFine: "Yes",
    vocabScore: 80,
    grammarScore: 85,
    emailScore: 90,
    cameraOffCount: 0,
    pace: "135 WPM (Optimal)",
    eyeContact: "93% Stable",
    summary: "Candidate Sathinath completed the interview. The new continuous video recording (26.9 MB) is fully stored in PostgreSQL.",
    proctorFlags: ["Biometric signals stable"],
    totalDurationSecs: 180
  };

  try {
    const res = await pool.query(
      `UPDATE interviews 
       SET status = 'Completed',
           report = $1
       WHERE id = $2`,
      [JSON.stringify(dummyReport), interviewId]
    );
    if (res.rowCount > 0) {
      console.log(`Successfully completed and set report card for interview ${interviewId}`);
    } else {
      console.log(`Interview ${interviewId} not found.`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to complete interview:', err.message);
    process.exit(1);
  }
}

completeUserTest();
