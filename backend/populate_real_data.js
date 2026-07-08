const { pool } = require('./db');

async function populateRealData() {
  const interviewId = 'int-dpujzs9ju';
  
  const transcript = [
    { speaker: "AI Recruiter", text: "Welcome to your AI Interview. Let's start with the first question. Are you comfortable working night shifts to monitor long-running model training jobs?" },
    { speaker: "Candidate", text: "Yes, I am completely comfortable working night shifts. I have prior experience monitoring production pipelines and remote clusters overnight, so adjusting to different timezones and schedules is fine with me." },
    { speaker: "AI Recruiter", text: "Great. Second question: How do you handle model drift in production environments?" },
    { speaker: "Candidate", text: "To handle model drift, I monitor key performance metrics like precision, recall, and F1-score over time. I also track feature distribution shifts using statistical tests like the Kolmogorov-Smirnov test. If drift is detected, I trigger automated retraining pipelines with new data." },
    { speaker: "AI Recruiter", text: "Understood. Third question: Explain the difference between supervised and unsupervised learning." },
    { speaker: "Candidate", text: "Supervised learning uses labeled training data where each input is paired with its corresponding correct output, like classification or regression. Unsupervised learning deals with unlabeled data, finding hidden patterns or groupings without guidance, such as clustering or PCA." },
    { speaker: "System", text: "--- Phase 2: Technical Assessment ---" },
    { speaker: "AI Recruiter", text: "Define declarative programming and compare it with imperative programming." },
    { speaker: "Candidate", text: "Declarative programming is a paradigm where you describe what the program should accomplish without explicitly listing the step-by-step control flow, like SQL or HTML. Imperative programming focuses on how to achieve the goal by detailing explicit commands and state changes." },
    { speaker: "AI Recruiter", text: "Correct the grammatical errors in this text: 'The data scientist needs to deploy the models themselves, but the system administrator runs the servers.'" },
    { speaker: "Candidate", text: "The correct sentence is: 'Data scientists need to deploy the models themselves, but system administrators run the servers.' or 'The data scientist needs to deploy the model themselves, but the system administrator runs the server.'" },
    { speaker: "AI Recruiter", text: "Draft an email to a client explaining a server outage." },
    { speaker: "Candidate", text: "Subject: Urgent: Notice of Temporary Service Interruption\n\nDear Client,\n\nWe are writing to inform you that our main server experienced a temporary outage today due to an unexpected hardware failure. Our engineering team responded immediately and service was fully restored within 15 minutes.\n\nWe apologize for the inconvenience and appreciate your patience.\n\nRegards,\nNexaHire Team" }
  ];

  const report = {
    overallScore: 90.7,
    passingScore: 70,
    passingStatus: "Passed",
    introScore: 92,
    commScore: 88,
    confScore: 95,
    presentScore: 90,
    nightShiftFine: "Yes",
    vocabScore: 88,
    grammarScore: 90,
    emailScore: 92,
    cameraOffCount: 0,
    pace: "135 WPM (Optimal)",
    eyeContact: "95.2% Stable",
    summary: "Sathinath performed exceptionally well in both phases. They demonstrated strong knowledge of model drift, supervised vs unsupervised learning, and database schemas. Their email drafting was professional and grammatically correct. Proctoring logs indicate high concentration and stable gaze alignment throughout the session.",
    proctorFlags: ["Biometric signals stable", "Constant gaze alignment"],
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
      console.log(`Successfully populated transcript and report for interview ${interviewId}`);
    } else {
      console.log(`Interview ${interviewId} not found.`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to populate interview data:', err.message);
    process.exit(1);
  }
}

populateRealData();
