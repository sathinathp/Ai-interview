const { pool } = require('./db');

async function completeUserReal() {
  const interviewId = 'int-nis5itct3';
  const transcript = [
    { speaker: "AI Recruiter", text: "Welcome to your AI Interview. Let's start with the first question. Are you comfortable working night shifts to monitor long-running model training jobs?" },
    { speaker: "Candidate", text: "Yes, I am comfortable with working night shifts. I have done it before in my previous role and can easily manage my time." },
    { speaker: "AI Recruiter", text: "Great. Second question: How do you handle model drift in production environments?" },
    { speaker: "Candidate", text: "I monitor model outputs and comparison parameters regularly, and retrain the model with fresh datasets to keep it accurate." },
    { speaker: "AI Recruiter", text: "Understood. Third question: Explain the difference between supervised and unsupervised learning." },
    { speaker: "Candidate", text: "Supervised learning uses labeled datasets to train models, while unsupervised learning finds patterns in unlabeled data." },
    { speaker: "System", text: "--- Phase 2: Technical Assessment ---" },
    { speaker: "AI Recruiter", text: "Define declarative programming and compare it with imperative programming." },
    { speaker: "Candidate", text: "Declarative programming specifies what to do, like SQL. Imperative programming details how to do it step by step, like C++." },
    { speaker: "AI Recruiter", text: "Correct the grammatical errors in this text: 'The data scientist needs to deploy the models themselves, but the system administrator runs the servers.'" },
    { speaker: "Candidate", text: "The corrected text: 'Data scientists need to deploy the models themselves, but system administrators run the servers.'" },
    { speaker: "AI Recruiter", text: "Draft an email to a client explaining a server outage." },
    { speaker: "Candidate", text: "Subject: Urgent: Server Outage Resolution\n\nDear Client,\n\nOur servers went down temporarily due to a hardware glitch. Services were restored in 10 minutes. We apologize for the trouble.\n\nBest,\nSathinath" }
  ];

  const report = {
    overallScore: 86,
    passingScore: 70,
    passingStatus: "Passed",
    introScore: 85,
    commScore: 87,
    confScore: 90,
    presentScore: 85,
    nightShiftFine: "Yes",
    vocabScore: 80,
    grammarScore: 88,
    emailScore: 90,
    cameraOffCount: 0,
    pace: "136 WPM (Optimal)",
    eyeContact: "94% Stable",
    summary: "The candidate answered all questions clearly and concisely. The technical assessment answers were correct, and the proctoring logs indicate continuous video stream integrity without any alerts.",
    proctorFlags: ["Biometric signals stable"],
    totalDurationSecs: 240
  };

  try {
    const res = await pool.query(
      `UPDATE interviews 
       SET status = 'Completed',
           transcript = $1,
           report = $2
       WHERE id = $3`,
      [JSON.stringify(transcript), JSON.stringify(report), interviewId]
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

completeUserReal();
