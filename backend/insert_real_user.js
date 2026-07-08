const { pool } = require('./db');

async function run() {
  const interviewId = 'int-thrs0q0td';
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
    overallScore: 86.4,
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
      `INSERT INTO interviews (
        id, candidate_name, candidate_email, job_role, status, 
        created_at, expires_at, duration_limit, passing_score, passcode,
        phase1_questions, phase2_questions, transcript, report, candidate_type
      ) VALUES (
        $1, $2, $3, $4, $5, 
        NOW(), NOW() + interval '1 day', 30, 70, $6,
        '[]'::jsonb, '[]'::jsonb, $7, $8, $9
      ) ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        transcript = EXCLUDED.transcript,
        report = EXCLUDED.report`,
      [
        interviewId, 'sathinath', 'sathinath852@gmail.com', 'AI / ML Engineer', 'Completed',
        '811561', JSON.stringify(transcript), JSON.stringify(report), 'fresher'
      ]
    );
    console.log("Successfully inserted/updated candidate in DB:", res.rowCount);
    process.exit(0);
  } catch (err) {
    console.error("Failed to insert candidate:", err);
    process.exit(1);
  }
}

run();
