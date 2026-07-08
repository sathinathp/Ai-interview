const { pool } = require('./db');

async function completeTest() {
  const interviewId = 'int-j7l90m55y';
  const dummyReport = {
    overallScore: 88,
    passingScore: 70,
    passingStatus: "Passed",
    introScore: 90,
    commScore: 85,
    confScore: 92,
    presentScore: 85,
    nightShiftFine: "Yes",
    vocabScore: 85,
    grammarScore: 90,
    emailScore: 90,
    cameraOffCount: 0,
    pace: "138 WPM (Optimal)",
    eyeContact: "94% Stable",
    summary: "Test Candidate performed excellently under the new recording format.",
    proctorFlags: ["Biometric signals highly stable", "Constant gaze alignment"],
    totalDurationSecs: 240 // 4 minutes
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

completeTest();
