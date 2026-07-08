const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { pool, initializeDatabase } = require('./db');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const nodemailer = require('nodemailer');
const http = require('http');
const { WebSocketServer, WebSocket: WsClient } = require('ws');
const { createClient } = require('@deepgram/sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'nexa_hire_secure_jwt_secret_key_2026_xyz';


const app = express();
const PORT = process.env.PORT || 5000;

// ─── SECURITY HEADERS (Helmet) ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // CSP handled by Vite on frontend
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// ─── CORS HARDENING ─────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman in dev)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} is not allowed.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Exam-Token', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  credentials: true
}));

// ─── BODY PARSING ───────────────────────────────────────────────────────────
app.use(bodyParser.json({ limit: '10mb' }));

// ─── GLOBAL RATE LIMITING ───────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use(globalLimiter);

// Strict rate limit for evaluation endpoint (costly OpenAI call)
const evaluateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // max 5 evaluation calls per 10 minutes per IP
  message: { error: 'Too many evaluation requests. Please wait.' }
});

// Strict rate limit for security violation logging
const violationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Violation log rate limit reached.' }
});

// ─── INPUT SANITIZER ────────────────────────────────────────────────────────
function sanitize(value) {
  if (typeof value === 'string') return xss(value.trim());
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === 'object' && value !== null) {
    const cleaned = {};
    for (const k of Object.keys(value)) {
      cleaned[k] = sanitize(value[k]);
    }
    return cleaned;
  }
  return value;
}


// ─── AUTHENTICATION MIDDLEWARES ──────────────────────────────────────────────
function authenticateHR(req, res, next) {
  let token = req.query.token;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'hr') {
      return res.status(403).json({ error: 'Access forbidden. HR access required.' });
    }
    req.hrUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authorization token.' });
  }
}

function authenticateCandidate(req, res, next) {
  let token = req.query.token;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'hr') {
      req.userRole = 'hr';
      next();
    } else if (decoded.role === 'candidate') {
      req.userRole = 'candidate';
      req.interviewId = decoded.interviewId;
      next();
    } else {
      return res.status(403).json({ error: 'Access forbidden.' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authorization token.' });
  }
}

// ─── DATABASE SETUP ─────────────────────────────────────────────────────────
async function setupTables() {
  await initializeDatabase();
  
  const client = await pool.connect();
  try {
    // 0. HR Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hr_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 1. Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Interviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS interviews (
        id VARCHAR(255) PRIMARY KEY,
        candidate_name VARCHAR(255),
        candidate_email VARCHAR(255),
        job_role VARCHAR(255),
        status VARCHAR(50),
        created_at TIMESTAMP,
        expires_at TIMESTAMP,
        duration_limit INT,
        passing_score INT,
        passcode VARCHAR(50),
        phase1_questions JSONB,
        phase2_questions JSONB,
        transcript JSONB,
        report JSONB
      )
    `);
    await client.query(`
      ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_type VARCHAR(50) DEFAULT 'experienced';
    `);
    await client.query(`
      ALTER TABLE interviews ADD COLUMN IF NOT EXISTS video_data BYTEA;
    `);

    // 3. Security violations table — stores every cheat attempt with full reason + timestamp
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_violations (
        id SERIAL PRIMARY KEY,
        interview_id VARCHAR(255) REFERENCES interviews(id) ON DELETE CASCADE,
        violation_type VARCHAR(100) NOT NULL,
        violation_reason TEXT NOT NULL,
        device_info TEXT,
        user_agent TEXT,
        ip_address VARCHAR(100),
        occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('PostgreSQL database tables verified and initialized successfully.');
  } catch (err) {
    console.error('Error executing PostgreSQL tables schema creation:', err.message);
  } finally {
    client.release();
  }
}

setupTables();


// ─── SECURITY & AUTHENTICATION ENDPOINTS ──────────────────────────────────────

// HR Register
app.post('/api/auth/hr/register', async (req, res) => {
  const { email, password, registrationKey } = req.body;

  if (!email || !password || !registrationKey) {
    return res.status(400).json({ error: 'Email, password, and company access code are required.' });
  }

  const serverKey = process.env.HR_REGISTRATION_KEY;
  if (!serverKey || registrationKey.trim() !== serverKey.trim()) {
    return res.status(403).json({ error: 'Invalid company access code.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO hr_users (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      [sanitize(email).toLowerCase().trim(), passwordHash]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'An HR account with this email already exists.' });
    }

    const hrUser = result.rows[0];
    const token = jwt.sign(
      { id: hrUser.id, email: hrUser.email, role: 'hr' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ success: true, token, user: { email: hrUser.email } });
  } catch (err) {
    console.error('[HR REGISTER] Registration failed:', err.message);
    res.status(500).json({ error: 'Registration failed due to server error.' });
  }
});

// HR Login
app.post('/api/auth/hr/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM hr_users WHERE email = $1',
      [sanitize(email).toLowerCase().trim()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const hrUser = result.rows[0];
    const isMatch = await bcrypt.compare(password, hrUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: hrUser.id, email: hrUser.email, role: 'hr' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ success: true, token, user: { email: hrUser.email } });
  } catch (err) {
    console.error('[HR LOGIN] Login failed:', err.message);
    res.status(500).json({ error: 'Login failed due to server error.' });
  }
});

// Candidate Login/Passcode Verification
app.post('/api/auth/candidate/login', async (req, res) => {
  const { interviewId, passcode } = req.body;

  if (!interviewId || !passcode) {
    return res.status(400).json({ error: 'Interview ID/Email and passcode are required.' });
  }

  const cleanId = sanitize(interviewId).trim();
  const cleanPasscode = sanitize(passcode).trim();

  try {
    const result = await pool.query(
      `SELECT id, candidate_email, passcode, status FROM interviews 
       WHERE id = $1 OR LOWER(candidate_email) = LOWER($2)`,
      [cleanId, cleanId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No interview invitation found matching this ID/Email.' });
    }

    const interview = result.rows[0];

    const crypto = require('crypto');
    const submittedHash = crypto.createHash('sha256').update(cleanPasscode).digest('hex');
    const serverHash   = crypto.createHash('sha256').update(String(interview.passcode).trim()).digest('hex');
    const isPasscodeValid = submittedHash === serverHash;

    if (!isPasscodeValid) {
      return res.status(401).json({ error: 'Invalid security passcode. Please verify your invitation details.' });
    }

    if (interview.status === 'Completed' || interview.status === 'Terminated') {
      return res.status(400).json({ error: 'This interview session has already been completed or terminated.' });
    }

    const token = jwt.sign(
      { interviewId: interview.id, role: 'candidate' },
      JWT_SECRET,
      { expiresIn: '3h' }
    );

    res.json({ success: true, token, interviewId: interview.id });
  } catch (err) {
    console.error('[CANDIDATE LOGIN] Verification failed:', err.message);
    res.status(500).json({ error: 'Authentication failed due to server error.' });
  }
});

// ─── API KEY STATUS ──────────────────────────────────────────────────────────
app.get('/api/config/key-status', authenticateHR, async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 FROM settings WHERE key = 'openai_api_key' AND value != ''");
    res.json({ isConfigured: result.rowCount > 0 });
  } catch (err) {
    console.error('Error fetching API key configuration status:', err.message);
    res.status(500).json({ error: 'Database check failed' });
  }
});

// ─── SAVE OPENAI API KEY ─────────────────────────────────────────────────────
app.post('/api/config/key', authenticateHR, async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key is required' });
  const safeKey = sanitize(apiKey);
  
  try {
    await pool.query(
      `INSERT INTO settings (key, value, updated_at) 
       VALUES ('openai_api_key', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) 
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [safeKey.trim()]
    );
    res.json({ success: true, message: 'OpenAI API key saved successfully in PostgreSQL database.' });
  } catch (err) {
    console.error('Error saving API key:', err.message);
    res.status(500).json({ error: 'Failed to persist API key' });
  }
});

// ─── GMAIL SMTP STORAGE & SENDING HELPERS ───────────────────────────────────
async function getGmailSMTP() {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'gmail_smtp'");
    if (result.rowCount === 0) return null;
    return JSON.parse(result.rows[0].value);
  } catch (err) {
    console.error('[GMAIL SMTP DB] Error reading SMTP settings:', err.message);
    return null;
  }
}

async function saveGmailSMTP(email, password) {
  const settingsObj = { email, password };
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) 
     VALUES ('gmail_smtp', $1, CURRENT_TIMESTAMP)
     ON CONFLICT (key) 
     DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(settingsObj)]
  );
}

async function deleteGmailSMTP() {
  await pool.query("DELETE FROM settings WHERE key = 'gmail_smtp'");
}

async function sendGmailEmail(candidateEmail, candidateName, jobRole, linkStr, passcode) {
  const smtpConfig = await getGmailSMTP();
  if (!smtpConfig) {
    console.log('[GMAIL SMTP] Invitation email skipped: No Gmail account connected.');
    return null;
  }

  const subject = `Your AI Screening Interview Invitation - NexaHire`;
  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: 0.05em; font-family: sans-serif;">NEXAHIRE</span>
        <div style="font-size: 10px; font-weight: 700; color: #06b6d4; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 2px;">Secured AI Proctoring Portal</div>
      </div>
      
      <p style="font-size: 16px; margin-top: 0;">Hello <strong>${candidateName}</strong>,</p>
      <p style="font-size: 14px; color: #475569;">You have been invited to complete a secured AI Screening Assessment for the position of <strong>${jobRole}</strong>.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Assessment Access Credentials</h3>
        <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-weight: 600; width: 120px;">Role Profile:</td>
            <td style="padding: 4px 0; color: #0f172a;">${jobRole}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600;">Registered Email:</td>
            <td style="padding: 4px 0; color: #0f172a; font-family: monospace;">${candidateEmail}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600;">Secure Passcode:</td>
            <td style="padding: 4px 0;"><code style="background-color: #e2ebfa; color: #1d4ed8; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-family: monospace; font-size: 13px; border: 1px solid #c7d2fe;">${passcode}</code></td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">Please prepare your environment (quiet room, stable internet, functional web camera and microphone) and click the button below to launch the proctored assessment:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${linkStr}" style="background-color: #2563eb; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25); transition: background-color 0.2s;">Start AI Screening Assessment</a>
      </div>

      <div style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
        <p style="margin: 0 0 6px 0;"><strong>Security Advisory:</strong> This screening process is monitored by AI proctors. Tab switching, browser resizing, or multi-screen setups will trigger security events in the integrity report.</p>
        <p style="margin: 0;">Sent automatically from NexaHire Recruitment workflow via connected Gmail SMTP services.</p>
      </div>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // direct SSL
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.password
      }
    });

    await transporter.sendMail({
      from: `"${candidateName} Assessment" <${smtpConfig.email}>`,
      to: candidateEmail,
      subject: subject,
      html: emailHtml
    });

    console.log(`[GMAIL SMTP] Email sent successfully to ${candidateEmail} via ${smtpConfig.email}`);
    return { success: true, isMock: false };
  } catch (err) {
    console.error('[GMAIL SMTP SENDER] Failed to send email via SMTP:', err.message);
    throw err;
  }
}

// ─── GMAIL SMTP API ENDPOINTS ────────────────────────────────────────────────

// 1. Get connection status
app.get('/api/auth/gmail/status', authenticateHR, async (req, res) => {
  try {
    const smtpConfig = await getGmailSMTP();
    if (smtpConfig) {
      res.json({
        connected: true,
        email: smtpConfig.email
      });
    } else {
      res.json({ connected: false });
    }
  } catch (err) {
    console.error('Error fetching Gmail SMTP status:', err.message);
    res.status(500).json({ error: 'Failed to retrieve connection status' });
  }
});

// 2. Connect (Verify credentials and save)
app.post('/api/auth/gmail/connect', authenticateHR, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: email,
        pass: password
      }
    });

    // Verify SMTP credentials
    await transporter.verify();

    // Save configuration if successful
    await saveGmailSMTP(email, password);
    console.log(`[GMAIL SMTP] Successfully connected user email: ${email}`);
    res.json({ success: true, email });
  } catch (err) {
    console.error('[GMAIL SMTP CONNECT] Verification failed:', err.message);
    res.status(500).json({ 
      error: `Authentication failed: ${err.message}. If you have 2-Step Verification enabled on your Google account, you MUST generate and use a 16-character App Password instead of your regular password.`
    });
  }
});

// 3. Disconnect session
app.post('/api/auth/gmail/disconnect', authenticateHR, async (req, res) => {
  try {
    await deleteGmailSMTP();
    res.json({ success: true, message: 'Gmail SMTP connection has been deleted.' });
  } catch (err) {
    console.error('Error disconnecting Gmail SMTP:', err.message);
    res.status(500).json({ error: 'Failed to delete SMTP configurations' });
  }
});

// ─── HR REGISTRATION KEY VALIDATION ─────────────────────────────────────────
// Validates that the submitted company access code matches the server secret.
// Rate-limited to 10 attempts per 15 min to prevent brute-force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many registration attempts. Please try again in 15 minutes.' }
});

app.post('/api/auth/validate-key', authLimiter, (req, res) => {
  const { registrationKey } = req.body;

  if (!registrationKey || typeof registrationKey !== 'string') {
    return res.status(400).json({ valid: false, error: 'Company access code is required.' });
  }

  const serverKey = process.env.HR_REGISTRATION_KEY;

  if (!serverKey) {
    console.error('[AUTH] HR_REGISTRATION_KEY is not set in .env file!');
    return res.status(500).json({ valid: false, error: 'Server configuration error. Contact your administrator.' });
  }

  // Constant-time string comparison to prevent timing attacks
  const crypto = require('crypto');
  const submittedHash = crypto.createHash('sha256').update(registrationKey.trim()).digest('hex');
  const serverHash   = crypto.createHash('sha256').update(serverKey.trim()).digest('hex');
  const isValid = submittedHash === serverHash;

  if (isValid) {
    console.log(`[AUTH] Successful HR registration key validation from ${req.socket.remoteAddress}`);
    res.json({ valid: true, message: 'Access code verified. You may complete registration.' });
  } else {
    console.warn(`[AUTH] Failed HR registration key attempt from ${req.socket.remoteAddress}`);
    res.status(403).json({ valid: false, error: 'Invalid company access code. Contact your HR administrator.' });
  }
});

// ─── LOG SECURITY VIOLATION (multi-monitor, tab switch, etc.) ────────────────
app.post('/api/security/violation', authenticateCandidate, violationLimiter, async (req, res) => {
  const {
    interviewId,
    violationType,
    violationReason,
    deviceInfo,
    userAgent
  } = req.body;

  if (!interviewId || !violationType || !violationReason) {
    return res.status(400).json({ error: 'interviewId, violationType and violationReason are required' });
  }

  // Restrict candidates to only log violations for their own session
  if (req.userRole === 'candidate' && req.interviewId !== interviewId) {
    return res.status(403).json({ error: 'Access forbidden. You can only log violations for your own session.' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  try {
    await pool.query(
      `INSERT INTO security_violations 
       (interview_id, violation_type, violation_reason, device_info, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sanitize(interviewId),
        sanitize(violationType),
        sanitize(violationReason),
        sanitize(deviceInfo || ''),
        sanitize(userAgent || req.headers['user-agent'] || ''),
        ip
      ]
    );
    console.log(`[SECURITY VIOLATION] Interview: ${interviewId} | Type: ${violationType} | Reason: ${violationReason}`);
    res.json({ success: true, message: 'Security violation logged.' });
  } catch (err) {
    console.error('Error logging security violation:', err.message);
    res.status(500).json({ error: 'Failed to log violation' });
  }
});

// ─── GET SECURITY VIOLATIONS FOR AN INTERVIEW ───────────────────────────────
app.get('/api/security/violations/:interviewId', authenticateHR, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, violation_type, violation_reason, device_info, user_agent, ip_address, occurred_at
       FROM security_violations 
       WHERE interview_id = $1 
       ORDER BY occurred_at DESC`,
      [req.params.interviewId]
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      violationType: r.violation_type,
      violationReason: r.violation_reason,
      deviceInfo: r.device_info,
      userAgent: r.user_agent,
      ipAddress: r.ip_address,
      occurredAt: r.occurred_at
    })));
  } catch (err) {
    console.error('Error fetching security violations:', err.message);
    res.status(500).json({ error: 'Failed to retrieve violations' });
  }
});

// ─── EVALUATE CANDIDATE ──────────────────────────────────────────────────────
app.post('/api/evaluate', authenticateCandidate, evaluateLimiter, async (req, res) => {
  const { 
    jobRole, 
    passingScore, 
    candidateAnswers, 
    cameraOffCount, 
    proctorLogs, 
    speakingPace, 
    eyeContactRate,
    candidateType
  } = req.body;

  // Sanitize input
  const safeJobRole = sanitize(jobRole || '');
  const safeAnswers = sanitize(candidateAnswers || []);

  try {
    const keyResult = await pool.query("SELECT value FROM settings WHERE key = 'openai_api_key'");
    if (keyResult.rowCount === 0 || !keyResult.rows[0].value) {
      return res.status(400).json({ error: 'OpenAI API key is not configured in the backend database.' });
    }
    const apiKey = keyResult.rows[0].value;

    const isFresher = candidateType === 'freshers';
    let prompt = '';

    if (isFresher) {
      prompt = `
        Evaluate the candidate's screening interview.
        You must calculate the evaluation results and scores based on BOTH the candidate's voice/delivery metrics and the transcribed text.
        
        Candidate Level: Fresher
        Job Role: ${safeJobRole}
        Passing Score Benchmark: ${passingScore || 70}%
        
        Transcript (Text Responses):
        ${JSON.stringify(safeAnswers, null, 2)}
        
        Voice & Proctoring metrics:
        - Speaking pace: ${speakingPace || 135} WPM (Optimal target: 110-150 WPM)
        - Stable eye contact rate: ${eyeContactRate || 92}%
        - Camera off count: ${cameraOffCount}
        - Focus drift / suspicious incidents: ${proctorLogs ? proctorLogs.length : 0}
        
        Please grade the candidate (0 to 100) on:
        1. introScore: Communication Skills (fluency, clarity, vocal delivery pace)
        2. commScore: Educational Background / Academic Knowledge (content accuracy)
        3. confScore: Learning Ability & Adaptability (response versatility)
        4. presentScore: Problem-Solving & Analytical Thinking (depth of logical response)
        5. vocabScore: Attitude & Professionalism (word choice and structure)
        6. grammarScore: Confidence & Presentation Skills (vocal stability, eye contact, lack of camera interruptions)
        7. emailScore: Cultural Fit & Willingness to Work (overall dedication and fit)
        
        Also evaluate "nightShiftFine" as "Yes" or "No" based on their response to timezone questions.
        
        Provide a professional overall evaluation summary of their performance, explaining how their voice delivery metrics (speaking pace, eye contact, proctor stability) and transcript quality influenced the scores.
        
        Format the output strictly as a JSON object with these keys:
        {
          "overallScore": number (0-100),
          "introScore": number (0-100),
          "commScore": number (0-100),
          "confScore": number (0-100),
          "presentScore": number (0-100),
          "nightShiftFine": "Yes" | "No",
          "vocabScore": number (0-100),
          "grammarScore": number (0-100),
          "emailScore": number (0-100),
          "summary": string
        }
      `;
    } else {
      prompt = `
        Evaluate the candidate's screening interview.
        You must calculate the evaluation results and scores based on BOTH the candidate's voice/delivery metrics and the transcribed text.
        
        Candidate Level: Experienced Professional
        Job Role: ${safeJobRole}
        Passing Score Benchmark: ${passingScore || 70}%
        
        Transcript (Text Responses):
        ${JSON.stringify(safeAnswers, null, 2)}
        
        Voice & Proctoring metrics:
        - Speaking pace: ${speakingPace || 135} WPM (Optimal target: 110-150 WPM)
        - Stable eye contact rate: ${eyeContactRate || 92}%
        - Camera off count: ${cameraOffCount}
        - Focus drift / suspicious incidents: ${proctorLogs ? proctorLogs.length : 0}
        
        Please grade the candidate (0 to 100) on:
        1. introScore: Technical Knowledge / Domain Expertise (content accuracy and terminology)
        2. commScore: Communication Skills (voice fluency, pacing, articulation)
        3. confScore: Relevant Experience (work history, depth of answers)
        4. presentScore: Problem-Solving & Analytical Skills (logical structure and analytical content)
        5. vocabScore: Attitude & Professionalism (word choice and professional vocabulary)
        6. grammarScore: Cultural Fit & Team Collaboration (vocal stability, eye contact, lack of camera interruptions)
        7. emailScore: Overall Confidence & Interview Performance (pacing, vocal delivery, and overall impact)
        
        Also evaluate "nightShiftFine" as "Yes" or "No" based on their response to timezone questions.
        
        Provide a professional overall evaluation summary of their performance, explaining how their voice delivery metrics (speaking pace, eye contact, proctor stability) and transcript quality influenced the scores.
        
        Format the output strictly as a JSON object with these keys:
        {
          "overallScore": number (0-100),
          "introScore": number (0-100),
          "commScore": number (0-100),
          "confScore": number (0-100),
          "presentScore": number (0-100),
          "nightShiftFine": "Yes" | "No",
          "vocabScore": number (0-100),
          "grammarScore": number (0-100),
          "emailScore": number (0-100),
          "summary": string
        }
      `;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an elite, objective HR scoring coordinator. You must return only a valid JSON object matching the requested schema.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    let cleanContent = (data.choices[0]?.message?.content || '').trim();
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    }
    const result = JSON.parse(cleanContent);
    
    const introScore = Math.max(0, Math.min(100, Number(result.introScore) || 0));
    const commScore = Math.max(0, Math.min(100, Number(result.commScore) || 0));
    const confScore = Math.max(0, Math.min(100, Number(result.confScore) || 0));
    const presentScore = Math.max(0, Math.min(100, Number(result.presentScore) || 0));
    const vocabScore = Math.max(0, Math.min(100, Number(result.vocabScore) || 0));
    const grammarScore = Math.max(0, Math.min(100, Number(result.grammarScore) || 0));
    const emailScore = Math.max(0, Math.min(100, Number(result.emailScore) || 0));
    
    result.introScore = introScore;
    result.commScore = commScore;
    result.confScore = confScore;
    result.presentScore = presentScore;
    result.vocabScore = vocabScore;
    result.grammarScore = grammarScore;
    result.emailScore = emailScore;
    
    result.overallScore = Number((
      (introScore + commScore + confScore + presentScore + vocabScore + grammarScore + emailScore) / 7
    ).toFixed(1));
    
    res.json(result);
  } catch (err) {
    console.error('Error during secure OpenAI evaluation proxy:', err.message);
    res.status(500).json({ error: 'OpenAI evaluation proxy call failed', details: err.message });
  }
});

// ─── INTERVIEWS CRUD ─────────────────────────────────────────────────────────
app.get('/api/interviews', authenticateHR, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM interviews ORDER BY created_at DESC');
    const interviews = result.rows.map(row => ({
      id: row.id,
      candidateName: row.candidate_name,
      candidateEmail: row.candidate_email,
      jobRole: row.job_role,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      durationLimit: row.duration_limit,
      passingScore: row.passing_score,
      passcode: row.passcode,
      phase1Questions: row.phase1_questions,
      phase2Questions: row.phase2_questions,
      transcript: row.transcript,
      report: row.report,
      candidateType: row.candidate_type
    }));
    res.json(interviews);
  } catch (err) {
    console.error('Error fetching interviews:', err.message);
    res.status(500).json({ error: 'Failed to retrieve interviews' });
  }
});

app.get('/api/interviews/:id/public', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, job_role, expires_at, status, candidate_name, candidate_email FROM interviews WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Interview not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      jobRole: row.job_role,
      expiresAt: row.expires_at,
      status: row.status,
      candidateName: row.candidate_name,
      candidateEmail: row.candidate_email
    });
  } catch (err) {
    console.error('Error fetching public interview details:', err.message);
    res.status(500).json({ error: 'Failed to retrieve public interview details' });
  }
});

app.get('/api/interviews/:id', authenticateCandidate, async (req, res) => {
  if (req.userRole === 'candidate' && req.interviewId !== req.params.id) {
    return res.status(403).json({ error: 'Access forbidden. You can only access your own session.' });
  }

  try {
    const result = await pool.query('SELECT * FROM interviews WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Interview not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      candidateName: row.candidate_name,
      candidateEmail: row.candidate_email,
      jobRole: row.job_role,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      durationLimit: row.duration_limit,
      passingScore: row.passing_score,
      passcode: row.passcode,
      phase1Questions: row.phase1_questions,
      phase2Questions: row.phase2_questions,
      transcript: row.transcript,
      report: row.report,
      candidateType: row.candidate_type
    });
  } catch (err) {
    console.error('Error fetching interview details:', err.message);
    res.status(500).json({ error: 'Failed to retrieve interview session details' });
  }
});

app.post('/api/interviews', authenticateHR, async (req, res) => {
  const { 
    id, candidateName, candidateEmail, jobRole, status, createdAt, expiresAt, 
    durationLimit, passingScore, passcode, phase1Questions, phase2Questions, 
    transcript, report, candidateType, invitationLink
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO interviews (
        id, candidate_name, candidate_email, job_role, status, created_at, expires_at, 
        duration_limit, passing_score, passcode, phase1_questions, phase2_questions, transcript, report, candidate_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id, sanitize(candidateName), sanitize(candidateEmail), sanitize(jobRole), 
        status, createdAt, expiresAt, durationLimit, passingScore, passcode, 
        JSON.stringify(phase1Questions), JSON.stringify(phase2Questions), 
        JSON.stringify(transcript || []), JSON.stringify(report || null),
        candidateType || 'experienced'
      ]
    );

    // Reconstruct proctored portal link if client did not supply one
    let finalLink = invitationLink;
    if (!finalLink) {
      const origin = req.headers.origin || 'http://localhost:5173';
      finalLink = `${origin}/?interviewId=${id}&passcode=${passcode}`;
    }

    // Try to send Gmail assessment invitation if configured
    let emailSent = false;
    let isMock = false;
    try {
      const emailResult = await sendGmailEmail(
        sanitize(candidateEmail),
        sanitize(candidateName),
        sanitize(jobRole),
        finalLink,
        passcode
      );
      if (emailResult && emailResult.success) {
        emailSent = true;
        isMock = !!emailResult.isMock;
      }
    } catch (emailErr) {
      console.warn('[GMAIL SENDER] Skipping auto-email:', emailErr.message);
    }

    res.json({ 
      success: true, 
      message: emailSent 
        ? `Interview session created. Invitation sent via Gmail.`
        : 'Interview session created successfully in database.',
      emailSent
    });
  } catch (err) {
    console.error('Error creating interview session in database:', err.message);
    res.status(500).json({ error: 'Failed to persist interview invitation' });
  }
});

app.put('/api/interviews/:id', authenticateCandidate, async (req, res) => {
  if (req.userRole === 'candidate' && req.interviewId !== req.params.id) {
    return res.status(403).json({ error: 'Access forbidden. You can only update your own session.' });
  }

  const { status, transcript, report, candidateName, candidateEmail } = req.body;
  try {
    const candidateNameVal = candidateName !== undefined ? sanitize(candidateName) : null;
    const candidateEmailVal = candidateEmail !== undefined ? sanitize(candidateEmail) : null;
    
    await pool.query(
      `UPDATE interviews 
       SET status = $1, 
           transcript = $2, 
           report = $3,
           candidate_name = COALESCE($4, candidate_name),
           candidate_email = COALESCE($5, candidate_email),
           video_data = CASE WHEN $7 = 'Active' THEN NULL ELSE video_data END
       WHERE id = $6`,
      [
        status, JSON.stringify(transcript), JSON.stringify(report), 
        candidateNameVal, candidateEmailVal, req.params.id, status
      ]
    );
    res.json({ success: true, message: 'Interview session updated successfully in database.' });
  } catch (err) {
    console.error('Error updating interview session in database:', err.message);
    res.status(500).json({ error: 'Failed to update interview details' });
  }
});

app.delete('/api/interviews/:id', authenticateHR, async (req, res) => {
  try {
    await pool.query('DELETE FROM interviews WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Interview session deleted successfully from database.' });
  } catch (err) {
    console.error('Error deleting interview session:', err.message);
    res.status(500).json({ error: 'Failed to delete interview record' });
  }
});

// ─── CLIENT ERROR LOG ────────────────────────────────────────────────────────
app.post('/api/log-error', (req, res) => {
  console.error('CLIENT_ERROR_LOGGED:', JSON.stringify(req.body, null, 2));
  try {
    const fs = require('fs');
    fs.appendFileSync('e:/Ai-interview/client_errors.log', JSON.stringify(req.body, null, 2) + '\n\n');
  } catch (err) {}
  res.json({ success: true });
});

// ─── VIDEO UPLOAD / STREAM ───────────────────────────────────────────────────
app.post('/api/interviews/:id/video', authenticateCandidate, (req, res) => {
  const interviewId = req.params.id;
  
  if (req.userRole === 'candidate' && req.interviewId !== interviewId) {
    return res.status(403).json({ error: 'Access forbidden. You can only upload video for your own session.' });
  }

  console.log(`[VIDEO UPLOAD] Starting upload for interview: ${interviewId} to PostgreSQL`);

  const chunks = [];
  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', async () => {
    const buffer = Buffer.concat(chunks);
    console.log(`[VIDEO UPLOAD] Success! Received ${buffer.length} bytes for interview: ${interviewId}`);
    try {
      await pool.query('UPDATE interviews SET video_data = $1 WHERE id = $2', [buffer, interviewId]);
      res.json({ success: true, message: 'Video uploaded and saved to PostgreSQL successfully' });
    } catch (err) {
      console.error('[VIDEO UPLOAD] Database update failed:', err);
      res.status(500).json({ error: 'Failed to save video to database' });
    }
  });

  req.on('error', (err) => {
    console.error('[VIDEO UPLOAD] Streaming failed:', err);
    res.status(500).json({ error: 'Streaming error during upload' });
  });
});

app.get('/api/interviews/:id/video', authenticateHR, async (req, res) => {
  const interviewId = req.params.id;
  try {
    const dbResult = await pool.query('SELECT video_data FROM interviews WHERE id = $1', [interviewId]);
    if (dbResult.rowCount === 0 || !dbResult.rows[0].video_data) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const buffer = dbResult.rows[0].video_data;
    const fileSize = buffer.length;

    if (fileSize === 0) {
      return res.status(404).json({ error: 'Video is empty' });
    }

    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start)) start = 0;
      if (isNaN(end)) end = fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
        return;
      }

      const chunksize = (end - start) + 1;
      const slice = buffer.slice(start, end + 1);

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/webm',
      };

      res.status(206).set(head);
      res.send(slice);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/webm',
        'Accept-Ranges': 'bytes',
      };
      res.status(200).set(head);
      res.send(buffer);
    }
  } catch (err) {
    console.error('Failed to retrieve video from database:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// ─── VIDEO BLOB DOWNLOAD ─────────────────────────────────────────────────────
app.get('/api/interviews/:id/video/blob', authenticateHR, async (req, res) => {
  const interviewId = req.params.id;
  try {
    const dbResult = await pool.query('SELECT video_data FROM interviews WHERE id = $1', [interviewId]);
    if (dbResult.rowCount === 0 || !dbResult.rows[0].video_data) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const buffer = dbResult.rows[0].video_data;
    if (buffer.length === 0) {
      return res.status(404).json({ error: 'Video is empty' });
    }

    res.status(200).set({
      'Content-Type': 'video/webm',
      'Content-Length': buffer.length,
      'Content-Disposition': 'attachment; filename="interview-' + interviewId + '.webm"',
      'Cache-Control': 'no-store',
    });

    res.send(buffer);
  } catch (err) {
    console.error('Failed to retrieve video from database:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── HTTP SERVER + WEBSOCKET SERVER ─────────────────────────────────────────
const httpServer = http.createServer(app);

// ─── DEEPGRAM LIVE TRANSCRIPTION PROXY ───────────────────────────────────────
// Architecture: Browser MediaRecorder → Backend WS → Deepgram Live API → Browser
// This is the same pattern used by HireVue, Talview, Glider.ai and other
// professional AI interview platforms for high-accuracy transcription.
const wss = new WebSocketServer({ server: httpServer, path: '/transcribe' });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';

wss.on('connection', (clientSocket, req) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const interviewId = params.get('id') || 'unknown';
  const token = params.get('token') || '';

  // Validate candidate token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'candidate' || decoded.interviewId !== interviewId) {
      console.warn(`[DEEPGRAM WS] Unauthorized WebSocket connection attempt for interview: ${interviewId}`);
      clientSocket.send(JSON.stringify({ type: 'error', message: 'UNAUTHORIZED' }));
      clientSocket.close();
      return;
    }
  } catch (err) {
    console.warn(`[DEEPGRAM WS] Invalid WebSocket connection token for interview: ${interviewId}`);
    clientSocket.send(JSON.stringify({ type: 'error', message: 'UNAUTHORIZED' }));
    clientSocket.close();
    return;
  }

  console.log(`[DEEPGRAM WS] New transcription session for interview: ${interviewId}`);

  // If no Deepgram API key is configured, fall back gracefully
  if (!DEEPGRAM_API_KEY) {
    console.warn('[DEEPGRAM WS] No DEEPGRAM_API_KEY set in .env — transcription proxy disabled.');
    clientSocket.send(JSON.stringify({ type: 'error', message: 'NO_API_KEY' }));
    clientSocket.close();
    return;
  }

  // Open a connection from backend → Deepgram
  const dgClient = createClient(DEEPGRAM_API_KEY);
  let dgConnection = null;
  let isReady = false;
  const pendingChunks = [];

  try {
    const live = dgClient.listen.live({
      model: 'nova-3',           // Deepgram's most accurate real-time model (2024)
      language: 'en-US',
      smart_format: true,        // Auto-punctuation and capitalization
      interim_results: true,     // Stream partial results as candidate speaks
      utterance_end_ms: 1200,    // Finalize after 1.2s of silence
      vad_events: true,          // Voice Activity Detection events
      endpointing: 400,          // Detect speech pauses (ms)
      encoding: 'webm-opus',     // Matches MediaRecorder output
      channels: 1,
      sample_rate: 48000,
    });

    dgConnection = live;

    live.on('open', () => {
      console.log(`[DEEPGRAM WS] Deepgram connection open for: ${interviewId}`);
      isReady = true;
      // Flush any audio that arrived before connection was ready
      pendingChunks.forEach(chunk => live.send(chunk));
      pendingChunks.length = 0;
      clientSocket.send(JSON.stringify({ type: 'ready' }));
    });

    live.on('Results', (data) => {
      const alt = data?.channel?.alternatives?.[0];
      if (!alt) return;
      const transcript = alt.transcript?.trim();
      if (!transcript) return;

      const isFinal = data.is_final;
      const confidence = alt.confidence || 0;

      // Forward transcript to browser client
      if (clientSocket.readyState === WsClient.OPEN) {
        clientSocket.send(JSON.stringify({
          type: isFinal ? 'final' : 'interim',
          transcript,
          confidence: Math.round(confidence * 100),
          words: alt.words || []
        }));
      }
    });

    live.on('UtteranceEnd', () => {
      // Signals end of a natural speech utterance
      if (clientSocket.readyState === WsClient.OPEN) {
        clientSocket.send(JSON.stringify({ type: 'utterance_end' }));
      }
    });

    live.on('SpeechStarted', () => {
      if (clientSocket.readyState === WsClient.OPEN) {
        clientSocket.send(JSON.stringify({ type: 'speech_started' }));
      }
    });

    live.on('error', (err) => {
      console.error(`[DEEPGRAM WS] Deepgram error for ${interviewId}:`, err.message);
      if (clientSocket.readyState === WsClient.OPEN) {
        clientSocket.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    live.on('close', () => {
      console.log(`[DEEPGRAM WS] Deepgram connection closed for: ${interviewId}`);
    });

  } catch (err) {
    console.error('[DEEPGRAM WS] Failed to create Deepgram connection:', err.message);
    clientSocket.send(JSON.stringify({ type: 'error', message: 'CONNECTION_FAILED' }));
    clientSocket.close();
    return;
  }

  // ── Receive binary audio chunks from browser and forward to Deepgram ──
  clientSocket.on('message', (data, isBinary) => {
    if (isBinary) {
      // Raw audio chunk from MediaRecorder
      if (isReady && dgConnection) {
        try { dgConnection.send(data); } catch (e) {}
      } else {
        // Buffer until Deepgram is ready
        pendingChunks.push(data);
      }
    } else {
      // JSON control message from browser
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'close' && dgConnection) {
          try { dgConnection.finish(); } catch (e) {}
        }
      } catch (e) {}
    }
  });

  clientSocket.on('close', () => {
    console.log(`[DEEPGRAM WS] Browser disconnected for: ${interviewId}`);
    if (dgConnection) {
      try { dgConnection.finish(); } catch (e) {}
    }
  });

  clientSocket.on('error', (err) => {
    console.error(`[DEEPGRAM WS] Client socket error for ${interviewId}:`, err.message);
  });
});

httpServer.listen(PORT, () => {
  console.log(`AI-Interview Backend server is listening on port ${PORT}`);
  console.log(`WebSocket transcription proxy: ws://localhost:${PORT}/transcribe`);
  const dgKeyStatus = DEEPGRAM_API_KEY ? 'Configured ✓' : 'NOT SET — using Web Speech API fallback';
  console.log(`Deepgram API Key: ${dgKeyStatus}`);
  console.log(`Security: helmet, rate-limiting, CORS, XSS protection active.`);
});
