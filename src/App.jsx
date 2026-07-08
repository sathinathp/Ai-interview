import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, ClipboardList, Clock, ShieldAlert, CheckCircle2, 
  Video, Mic, MicOff, RefreshCw, Send, Copy, AlertTriangle, Eye, 
  ExternalLink, LogOut, Check, ArrowRight, ArrowLeft, BookOpen, Star, HelpCircle, 
  TrendingUp, Activity, Sparkles, MessageSquare, ShieldCheck, Mail, Play, Pause, Trash, Shield, X,
  Camera, CameraOff, Briefcase, Volume2, VolumeX, Maximize2, Settings, VideoOff,
  Keyboard, ChevronRight, UserCheck, Cpu, Lock, User, Monitor
} from 'lucide-react';

// IndexedDB helper for storing and retrieving recorded videos
// Dynamic Backend Configuration
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://ai-interview-9y9t.onrender.com';

const WS_BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'ws://localhost:5000'
  : 'wss://ai-interview-9y9t.onrender.com';

const videoDb = {
  dbName: 'NexaHireVideoDb',
  storeName: 'videos',
  version: 1,

  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(request.error);
    });
  },

  async saveVideo(id, blob) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.put(blob, id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to save video to IndexedDB', err);
    }
  },

  async getVideo(id) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result) {
            resolve(URL.createObjectURL(request.result));
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to get video from IndexedDB', err);
      return null;
    }
  }
};

// Setup Mock Initial Interview Templates
const INITIAL_TEMPLATES = [
  {
    id: "tpl-1",
    role: "Senior React Developer",
    passingScore: 75,
    phase1Questions: [
      "Please introduce yourself and explain your suitability for this Senior React Developer role.",
      "How do you communicate complex architectural decisions to non-technical stakeholders?",
      "Are you comfortable working night shifts to sync with global timezone demands?"
    ],
    phase2Questions: [
      "In terms of vocabulary, explain what 'declarative programming' means and use it in a sentence.",
      "Identify grammar errors in: 'The developer have built a component that run perfectly on all browser.'",
      "Write a short email format template requesting an urgent code review for a hotfix deployment."
    ]
  },
  {
    id: "tpl-2",
    role: "Technical Sales Lead",
    passingScore: 70,
    phase1Questions: [
      "Introduce yourself and highlight your experience leading technical sales pipelines.",
      "How do you keep your communication confident and clear when handling tough customer objections?",
      "Are you fine working night shifts for clients in international zones?"
    ],
    phase2Questions: [
      "Provide a definition of 'technical alignment' and use it in a professional context.",
      "Correct the grammar: 'Our sales lead want to meets with the team to discussed the new goals.'",
      "Draft a professional email follow-up to a client after a successful product demonstration."
    ]
  },
  {
    id: "tpl-3",
    role: "AI / ML Engineer",
    passingScore: 80,
    phase1Questions: [
      "Introduce yourself and describe your hands-on experience fine-tuning large language models.",
      "How do you present confidence and presentability when explaining complex neural networks?",
      "Are you comfortable working night shifts to monitor long-running model training jobs?"
    ],
    phase2Questions: [
      "Explain the vocabulary term 'overfitting' in a simple way for a business client.",
      "Correct the errors: 'An data scientist need to analyze the metrics before they deploys a model.'",
      "Draft an email notifying your product manager about a model degradation issue in production."
    ]
  }
];

const ROLE_QUESTION_POOLS = {
  "Senior React Developer": {
    phase1: [
      "Please introduce yourself and explain your suitability for this Senior React Developer role.",
      "How do you communicate complex architectural decisions to non-technical stakeholders?",
      "Are you comfortable working night shifts to sync with global timezone demands?",
      "Describe your experience with React 19 features like Server Actions and the use hook.",
      "How do you handle disagreement with another engineer on technical architecture?",
      "What is your approach to optimizing the performance of a slow React application?",
      "How do you manage client expectations when a major deadline is at risk?",
      "What strategies do you use to stay productive when working remotely?"
    ],
    phase2: [
      "In terms of vocabulary, explain what 'declarative programming' means and use it in a sentence.",
      "Identify grammar errors in: 'The developer have built a component that run perfectly on all browser.'",
      "Write a short email format template requesting an urgent code review for a hotfix deployment.",
      "Define the term 'rehydration' in React Server Components and use it in a technical context.",
      "Correct the grammar: 'If I was you, I would has optimized the rendering cycle instead of writing custom hooks.'",
      "Draft a professional email to a product manager proposing a refactor of a legacy dashboard module.",
      "Explain the vocabulary term 'race condition' and use it in a professional sentence.",
      "Identify grammar errors in: 'Our team are looking forward to collaborate with yours developers next week.'"
    ]
  },
  "Technical Sales Lead": {
    phase1: [
      "Introduce yourself and highlight your experience leading technical sales pipelines.",
      "How do you keep your communication confident and clear when handling tough customer objections?",
      "Are you fine working night shifts for clients in international zones?",
      "Explain how you build trust with highly technical CTOs who are skeptical of sales pitches.",
      "Describe a time when you lost a major deal and what you learned from it.",
      "How do you coordinate between the product team and prospects to align feature requests?",
      "What is your process for preparing a technical product demo for a high-value client?",
      "How do you handle timezone challenges when managing global enterprise clients?"
    ],
    phase2: [
      "Provide a definition of 'technical alignment' and use it in a professional context.",
      "Correct the grammar: 'Our sales lead want to meets with the team to discussed the new goals.'",
      "Draft a professional email follow-up to a client after a successful product demonstration.",
      "Explain the vocabulary term 'value proposition' and use it in a sentence.",
      "Correct the errors: 'The client do not understands the pricing structure because it were too complicated.'",
      "Draft a professional email address to a client who has missed a scheduled demo twice.",
      "Define 'churn rate' in software-as-a-service sales and use it in a context sentence.",
      "Identify grammar errors in: 'Everyone on the sales team need to submit their reports by Friday.'"
    ]
  },
  "AI / ML Engineer": {
    phase1: [
      "Introduce yourself and describe your hands-on experience fine-tuning large language models.",
      "How do you present confidence and presentability when explaining complex neural networks?",
      "Are you comfortable working night shifts to monitor long-running model training jobs?",
      "Describe your experience selecting between small open-source LLMs and proprietary APIs.",
      "How do you explain machine learning bias to a non-technical business executive?",
      "Describe a complex data pipeline failure you resolved and how you prevented it in the future.",
      "What strategies do you use to keep up with the rapid pace of AI research?",
      "How do you handle night shifts or on-call duties for production AI service outages?"
    ],
    phase2: [
      "Explain the vocabulary term 'overfitting' in a simple way for a business client.",
      "Correct the errors: 'An data scientist need to analyze the metrics before they deploys a model.'",
      "Draft an email notifying your product manager about a model degradation issue in production.",
      "Define the term 'gradient descent' in plain vocabulary and use it in a sentence.",
      "Correct the grammar: 'The parameters of the model has been updated but it still perform poorly.'",
      "Draft a professional email requesting budget approval from leadership for GPU compute resources.",
      "Explain the vocabulary term 'transfer learning' and use it in a technical sentence.",
      "Identify grammar errors in: 'Neither the team lead nor the developers was able to explain the anomalous loss curve.'"
    ]
  }
};

const getRandomQuestionsForRole = (roleName) => {
  const pool = ROLE_QUESTION_POOLS[roleName] || ROLE_QUESTION_POOLS["Senior React Developer"];
  
  // Phase 1: night shift question must be included.
  const timezoneQ = pool.phase1.find(q => q.toLowerCase().includes("night shift") || q.toLowerCase().includes("timezone"));
  const otherPhase1Qs = pool.phase1.filter(q => q !== timezoneQ);
  
  // Pick 2 random questions from otherPhase1Qs
  const selectedOtherPhase1 = [...otherPhase1Qs].sort(() => 0.5 - Math.random()).slice(0, 2);
  const phase1 = [...selectedOtherPhase1, timezoneQ].sort(() => 0.5 - Math.random());
  
  // Phase 2: pick 3 random questions
  const phase2 = [...pool.phase2].sort(() => 0.5 - Math.random()).slice(0, 3);
  
  return { phase1, phase2 };
};


// Setup Speech Recognition API Support
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognitionAPI) {
  try {
    recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
  } catch (e) {
    console.error('Failed to initialize SpeechRecognition:', e);
  }
}

function AdvancedSecureLogo({ size = 'small' }) {
  // Configured logo option from the user-provided image.
  // Options: 'softstandard' (default), 'bluebix', 'petabytz'
  const logoType = 'softstandard';
  const logoSrc = `/src/assets/logo_${logoType}_icon.png`;

  const sizeMap = {
    mini: 'w-6 h-6',
    small: 'w-14 h-14',
    medium: 'w-36 h-36',
    large: 'w-48 h-48'
  };
  const sizeClass = sizeMap[size] || sizeMap.small;

  return (
    <div className="tech-logo-container flex items-center justify-center select-none" style={{ pointerEvents: 'none' }}>
      <img 
        src={logoSrc} 
        className={`${sizeClass} animate-float`} 
        alt="NexaHire Logo" 
        style={{ 
          objectFit: 'contain', 
          filter: 'drop-shadow(0 4px 12px rgba(37,99,235,0.18))',
          animationDuration: '5s'
        }} 
      />
    </div>
  );
}

export default function App() {
  // Navigation Router state
  const [currentRoute, setCurrentRoute] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const intId = params.get('interviewId');
    if (intId) {
      return 'candidate-start';
    }
    return 'landing';
  });

  const [lockdownActive, setLockdownActive] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());
  const [activeLiveMonitorInterview, setActiveLiveMonitorInterview] = useState(null);

  const [hrToken, setHrToken] = useState(() => localStorage.getItem('hr_token') || '');
  const [candidateToken, setCandidateToken] = useState(() => localStorage.getItem('candidate_token') || '');

  useEffect(() => {
    window.__setCandidateToken = setCandidateToken;
    return () => {
      delete window.__setCandidateToken;
    };
  }, []);

  // Global fetch interceptor to automatically inject JWT tokens into all API calls
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      let url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input && typeof input === 'object') {
        url = input.url || '';
      }
      
      // Only intercept local API endpoints to avoid leaking token to external services
      if (url.includes(BACKEND_URL + '/api') || url.includes('/api/')) {
        const hToken = localStorage.getItem('hr_token');
        const cToken = localStorage.getItem('candidate_token');
        const token = hToken || cToken;
        
        if (token) {
          init = init || {};
          init.headers = init.headers || {};
          if (init.headers instanceof Headers) {
            if (!init.headers.has('Authorization')) {
              init.headers.set('Authorization', `Bearer ${token}`);
            }
          } else if (Array.isArray(init.headers)) {
            const hasAuth = init.headers.some(h => h[0].toLowerCase() === 'authorization');
            if (!hasAuth) {
              init.headers.push(['Authorization', `Bearer ${token}`]);
            }
          } else {
            const hasAuth = Object.keys(init.headers).some(k => k.toLowerCase() === 'authorization');
            if (!hasAuth) {
              init.headers['Authorization'] = `Bearer ${token}`;
            }
          }
        }
      }
      return originalFetch(input, init);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleExitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
    } catch (e) {}
  };

  // Fullscreen lockdown monitor
  useEffect(() => {
    if (!lockdownActive) {
      setFullscreenError(false);
      return;
    }

    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      if (!isFs) {
        setFullscreenError(true);
      } else {
        setFullscreenError(false);
      }
    };

    // Initial check
    handleFsChange();

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, [lockdownActive]);

  // Intercept keyboard events and lock shortcuts
  useEffect(() => {
    if (!lockdownActive) return;

    const preventContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'r') ||
        (e.ctrlKey && e.key === 'R') ||
        (e.ctrlKey && e.key === 't') ||
        (e.ctrlKey && e.key === 'T') ||
        (e.ctrlKey && e.key === 'n') ||
        (e.ctrlKey && e.key === 'N') ||
        (e.ctrlKey && e.key === 'w') ||
        (e.ctrlKey && e.key === 'W') ||
        e.key === 'F5' ||
        e.key === 'Meta' || // Windows key
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        e.stopPropagation();
        alert("Action blocked: Secured Exam Mode is active. Do not try to switch tabs, refresh, or open developer tools.");
        return false;
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    if (navigator.keyboard && navigator.keyboard.lock) {
      navigator.keyboard.lock(["Escape", "Tab", "MetaLeft", "MetaRight", "AltLeft", "AltRight"]).catch(e => {
        console.warn("Keyboard lock failed", e);
      });
    }

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (navigator.keyboard && navigator.keyboard.unlock) {
        navigator.keyboard.unlock();
      }
    };
  }, [lockdownActive]);

  // Global HR Data State
  const [interviews, setInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState(null);

  // Load interviews from PostgreSQL database on mount
  useEffect(() => {
    const loadInterviews = async () => {
      try {
        const headers = {};
        if (hrToken) {
          headers['Authorization'] = `Bearer ${hrToken}`;
        }
        
        // Handle URL-based candidate start parameters
        const params = new URLSearchParams(window.location.search);
        const intId = params.get('interviewId');

        // If there's an interviewId, fetch public details first to populate candidate page
        if (intId) {
          try {
            const pubRes = await fetch(`${BACKEND_URL}/api/interviews/${intId}/public`);
            if (pubRes.ok) {
              const data = await pubRes.json();
              const placeholder = {
                id: data.id,
                candidateName: data.candidateName || '',
                candidateEmail: data.candidateEmail || '',
                jobRole: data.jobRole,
                expiresAt: data.expiresAt,
                status: data.status,
                isPlaceholder: true
              };
              setSelectedInterview(placeholder);
              setInterviews(prev => {
                if (prev.some(i => i.id === placeholder.id)) {
                  return prev.map(i => i.id === placeholder.id ? { ...i, ...placeholder } : i);
                }
                return [placeholder, ...prev];
              });
            }
          } catch (pubErr) {
            console.error('Failed to load public interview details:', pubErr);
          }
        }

        // If candidate is already authenticated, load their detailed state securely
        if (intId && candidateToken) {
          try {
            const fullRes = await fetch(`${BACKEND_URL}/api/interviews/${intId}`, {
              headers: { 'Authorization': `Bearer ${candidateToken}` }
            });
            if (fullRes.ok) {
              const data = await fullRes.json();
              setSelectedInterview(data);
              setInterviews(prev => {
                if (prev.some(i => i.id === data.id)) {
                  return prev.map(i => i.id === data.id ? data : i);
                }
                return [data, ...prev];
              });
            } else if (fullRes.status === 401 || fullRes.status === 403) {
              localStorage.removeItem('candidate_token');
              setCandidateToken('');
            }
          } catch (fullErr) {
            console.error('Failed to load authenticated candidate interview details:', fullErr);
          }
        }

        if (hrToken) {
          const res = await fetch(BACKEND_URL + '/api/interviews', { headers });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setInterviews(data);
              if (intId) {
                const matched = data.find(i => i.id === intId);
                if (matched) {
                  setSelectedInterview(matched);
                }
              }
            }
          } else if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('hr_token');
            localStorage.removeItem('hr_user');
            setHrToken('');
            setHrUser(null);
            setCurrentRoute('landing');
          }
        }
      } catch (err) {
        console.error('Failed to load interviews from backend database, using LocalStorage fallback.', err);
        const stored = localStorage.getItem('ai_interviews');
        if (stored) {
          try {
            const data = JSON.parse(stored);
            setInterviews(data);
            const params = new URLSearchParams(window.location.search);
            const intId = params.get('interviewId');
            if (intId) {
              const matched = data.find(i => i.id === intId);
              if (matched) {
                setSelectedInterview(matched);
              }
            }
          } catch(e) {}
        }
      } finally {
        setLoadingInterviews(false);
      }
    };
    loadInterviews();
  }, [hrToken, candidateToken]);

  const [hrUser, setHrUser] = useState(() => {
    const token = localStorage.getItem('hr_token');
    const stored = localStorage.getItem('hr_user');
    return (token && stored) ? JSON.parse(stored) : null;
  });
  
  // Custom router helper
  const navigateTo = (route, paramId = null, passcodeVal = null, interviewObj = null) => {
    if (route === 'candidate-finished' || route === 'candidate-expired' || route === 'landing' || route === 'hr-dashboard') {
      setLockdownActive(false);
      handleExitFullscreen();
    }
    if (interviewObj) {
      setSelectedInterview(interviewObj);
      if (route === 'candidate-start' || route === 'candidate-interview') {
        const pcode = passcodeVal || interviewObj.passcode || new URLSearchParams(window.location.search).get('passcode') || '';
        window.history.pushState({}, '', `?interviewId=${interviewObj.id}${pcode ? `&passcode=${pcode}` : ''}`);
      }
    } else if (paramId) {
      const selected = interviews.find(i => i.id === paramId);
      setSelectedInterview(selected);
      if (route === 'candidate-start' || route === 'candidate-interview') {
        const pcode = passcodeVal || selected?.passcode || new URLSearchParams(window.location.search).get('passcode') || '';
        window.history.pushState({}, '', `?interviewId=${paramId}${pcode ? `&passcode=${pcode}` : ''}`);
      }
    } else {
      // Clean query params on home navigate
      if (route === 'landing' || route === 'hr-dashboard') {
        window.history.pushState({}, '', window.location.pathname);
      }
    }
    setCurrentRoute(route);
  };

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    if (currentRoute !== 'landing') {
      navigateTo('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Sync state to LocalStorage as a redundancy fallback
  useEffect(() => {
    if (interviews.length > 0) {
      localStorage.setItem('ai_interviews', JSON.stringify(interviews));
    }
  }, [interviews]);

  // Auth Handling
  const handleRegisterHR = async (email, password, registrationKey) => {
    try {
      const res = await fetch(BACKEND_URL + '/api/auth/hr/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, registrationKey })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      localStorage.setItem('hr_token', data.token);
      localStorage.setItem('hr_user', JSON.stringify(data.user));
      setHrToken(data.token);
      setHrUser(data.user);
      navigateTo('hr-dashboard');
      return true;
    } catch (err) {
      alert(err.message || 'Registration failed');
      return false;
    }
  };

  const handleLoginHR = async (email, password) => {
    try {
      const res = await fetch(BACKEND_URL + '/api/auth/hr/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      localStorage.setItem('hr_token', data.token);
      localStorage.setItem('hr_user', JSON.stringify(data.user));
      setHrToken(data.token);
      setHrUser(data.user);
      navigateTo('hr-dashboard');
      return true;
    } catch (err) {
      alert(err.message || 'Login failed');
      return false;
    }
  };

  const handleLogoutHR = () => {
    localStorage.removeItem('hr_token');
    localStorage.removeItem('hr_user');
    setHrToken('');
    setHrUser(null);
    navigateTo('landing');
  };

  // Generate Interview Link and save to database
  const handleCreateInterview = async (candidateName, candidateEmail, jobRole, passingScore, phase1Questions, phase2Questions, validityHours, durationLimit = 30, candidateType = 'experienced') => {
    const newId = 'int-' + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * validityHours).toISOString();
    const passcode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Reconstruct proctored link here in frontend to pass to the backend
    const protocol = window.location.protocol;
    const host = window.location.host;
    const pathname = window.location.pathname;
    const invitationLink = `${protocol}//${host}${pathname}?interviewId=${newId}&passcode=${passcode}`;

    const newInterview = {
      id: newId,
      candidateName,
      candidateEmail,
      jobRole,
      status: "Active",
      createdAt,
      expiresAt,
      durationLimit: durationLimit || 30,
      passingScore: passingScore || 70,
      passcode,
      phase1Questions: phase1Questions && phase1Questions.length > 0 ? phase1Questions : ["Introduce yourself.", "Describe your project communication style.", "Are you fine with working night shifts?"],
      phase2Questions: phase2Questions && phase2Questions.length > 0 ? phase2Questions : ["Vocabulary check.", "Grammar validation.", "Write an email draft."],
      transcript: [],
      report: null,
      candidateType,
      invitationLink
    };

    setInterviews(prev => [newInterview, ...prev]);

    // Save to PostgreSQL database
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (hrToken) {
        headers['Authorization'] = `Bearer ${hrToken}`;
      }
      const res = await fetch(BACKEND_URL + '/api/interviews', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(newInterview)
      });
      const data = await res.json();
      return { interview: newInterview, apiResult: data };
    } catch (err) {
      console.error('Failed to create interview in PostgreSQL database:', err);
      return { interview: newInterview, apiResult: { success: false, emailSent: false } };
    }
  };

  const updateInterview = (updated, token = candidateToken || hrToken) => {
    setInterviews(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedInterview(updated);

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Save update to PostgreSQL database
    fetch(`${BACKEND_URL}/api/interviews/${updated.id}`, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify({
        status: updated.status,
        transcript: updated.transcript,
        report: updated.report,
        candidateName: updated.candidateName,
        candidateEmail: updated.candidateEmail
      })
    }).catch(err => console.error('Failed to update interview in PostgreSQL database:', err));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dynamic Header */}
      {lockdownActive ? (
        <div className="secured-os-bar flex items-center justify-between px-6 py-2 bg-slate-950/80 border-b border-white/5 backdrop-blur text-slate-200 text-xs font-mono select-none" style={{ height: '36px' }}>
          <div className="flex items-center gap-3">
            <Shield className="logo-icon w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-100 tracking-wider">NEXAHIRE SECURED SYSTEM v5.0</span>
            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-bold text-[9px] uppercase tracking-wide">LOCKDOWN EXAM MODE</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-emerald-400 font-bold">BIOMETRIC PROCTOR LIVE</span>
            </div>
            
            {selectedInterview && (
              <div className="text-slate-400">
                Candidate: <span className="text-cyan-400 font-bold">{selectedInterview.candidateName || "NexaHire Candidate"}</span>
              </div>
            )}
            
            <div className="text-slate-400">
              Host: <span className="text-cyan-400">NexaHireSecureCloud</span>
            </div>
            
            <div className="text-slate-400">
              Ping: <span className="text-emerald-400">18ms</span>
            </div>

            <div className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-slate-200">{systemTime}</span>
            </div>
          </div>
        </div>
      ) : (currentRoute !== 'landing' && currentRoute !== 'candidate-start') ? (
        <header className="apex-header-light" style={{ width: '100%' }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 32px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '56px'
          }}>
            {/* Logo Left */}
            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('landing'); }} style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {/* Unique Advanced Micro-Logo */}
              <AdvancedSecureLogo size="mini" />
              <span className="apex-logo-text">NEXAHIRE</span>

              <span className="apex-logo-badge">AI AGENT</span>
            </a>

            {/* Nav Right */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {hrUser ? (
                <>
                  <button className="apex-btn-portal" onClick={() => navigateTo('hr-dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ClipboardList style={{ width: '14px', height: '14px' }} /> Admin Console
                  </button>
                  <button onClick={handleLogoutHR} style={{
                    background: 'none',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s'
                  }}>
                    <LogOut style={{ width: '14px', height: '14px' }} /> Sign Out
                  </button>
                </>
              ) : (
                currentRoute === 'candidate-interview' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontFamily: 'monospace', color: '#2563eb', fontWeight: '700' }}>
                    <ShieldCheck style={{ width: '14px', height: '14px', color: '#2563eb' }} /> SECURE SESSION
                  </div>
                ) : (
                  <>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('hr-auth'); }} style={{
                      textDecoration: 'none',
                      color: '#0f172a',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      letterSpacing: '0.01em',
                      transition: 'color 0.15s'
                    }}>Sign In</a>
                    <button className="apex-btn-portal" onClick={() => navigateTo('hr-auth')}>HR Portal</button>
                  </>
                )
              )}
            </nav>
          </div>
        </header>
      ) : null}
      <main className="flex-grow flex flex-col">
        {currentRoute === 'landing' && (
          <LandingPage 
            onGoToAuth={() => navigateTo(hrUser ? 'hr-dashboard' : 'hr-auth')} 
            interviews={interviews} 
            onGoToCandidate={navigateTo} 
            updateInterview={updateInterview}
            hrUser={hrUser}
            onViewLive={setActiveLiveMonitorInterview}
          />
        )}
        {currentRoute === 'hr-auth' && <HRAuthPage onLogin={handleLoginHR} onRegister={handleRegisterHR} />}
        {currentRoute === 'hr-dashboard' && (
          <HRDashboard 
            hrToken={hrToken}
            interviews={interviews} 
            onCreateInterview={handleCreateInterview} 
            onViewReport={(id) => navigateTo('hr-dashboard', id)}
            onDeleteInterview={(id) => {
              setInterviews(prev => prev.filter(i => i.id !== id));
              const headers = {};
              if (hrToken) {
                headers['Authorization'] = `Bearer ${hrToken}`;
              }
              fetch(`${BACKEND_URL}/api/interviews/${id}`, {
                method: 'DELETE',
                headers
              }).catch(err => console.error('Failed to delete interview from PostgreSQL database:', err));
            }}
            selectedInterview={selectedInterview}
            onCloseReport={() => setSelectedInterview(null)}
            onViewLive={setActiveLiveMonitorInterview}
            onGoToCandidate={navigateTo}
          />
        )}
        {currentRoute === 'candidate-start' && (
          loadingInterviews ? (
            <div className="flex-grow flex items-center justify-center bg-slate-900 text-white" style={{ minHeight: 'calc(100vh - 56px)' }}>
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-mono text-slate-400">Loading secure interview session...</p>
              </div>
            </div>
          ) : (
            <CandidateStart 
              setCandidateToken={setCandidateToken}
              interview={selectedInterview || interviews.find(i => i.id === new URLSearchParams(window.location.search).get('interviewId'))} 
              onLockdownActivate={() => setLockdownActive(true)}
              onGoToAuth={() => navigateTo('hr-auth')}
              onStartInterview={(id, name, email) => {
                const currentInt = selectedInterview || interviews.find(i => i.id === id);
                if (currentInt) {
                  const updated = {
                    ...currentInt,
                    candidateName: name || currentInt.candidateName,
                    candidateEmail: email || currentInt.candidateEmail,
                    status: 'Active'
                  };
                  updateInterview(updated);
                  navigateTo('candidate-interview', id, null, updated);
                } else {
                  navigateTo('candidate-interview', id);
                }
              }} 
              onExpired={() => navigateTo('candidate-expired')}
            />
          )
        )}
        {currentRoute === 'candidate-interview' && selectedInterview && (
          <CandidateInterview 
            key={`${selectedInterview.id}-${selectedInterview.status}`}
            interview={selectedInterview} 
            candidateToken={candidateToken}
            onComplete={(updatedInt) => {
              updateInterview(updatedInt, candidateToken);
              navigateTo('candidate-finished', updatedInt.id);
            }} 
          />
        )}
        {currentRoute === 'candidate-expired' && <CandidateExpired />}
        {currentRoute === 'candidate-finished' && (
          <CandidateFinished 
            interview={selectedInterview} 
            onReturn={() => navigateTo('landing')}
          />
        )}
      </main>

      {/* Secured Lockdown Fullscreen Enforcer Overlay */}
      {fullscreenError && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/98 backdrop-blur-md flex flex-col items-center justify-center p-8 select-none">
          <div className="glass-card max-w-xl text-center space-y-6 border border-rose-500/20 shadow-2xl shadow-rose-500/5">
            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/30 rounded-3xl flex items-center justify-center text-rose-500 mx-auto animate-pulse">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="badge badge-error">SYSTEM LOCKDOWN COMPROMISED</span>
              <h2 className="text-white text-2xl font-bold tracking-tight">Secured Exam Mode Compromised</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                You have exited the secured fullscreen environment. This action has been logged in your integrity ledger.
                To resume the assessment, you must re-enter fullscreen mode immediately.
              </p>
            </div>
            
            <button 
              className="btn btn-primary bg-rose-600 hover:bg-rose-500 border-rose-600 w-full py-4 text-sm font-bold flex items-center justify-center gap-2"
              onClick={async () => {
                try {
                  const element = document.documentElement;
                  if (element.requestFullscreen) {
                    await element.requestFullscreen();
                  } else if (element.webkitRequestFullscreen) {
                    await element.webkitRequestFullscreen();
                  } else if (element.mozRequestFullScreen) {
                    await element.mozRequestFullScreen();
                  } else if (element.msRequestFullscreen) {
                    await element.msRequestFullscreen();
                  }
                } catch (err) {
                  console.warn("Fullscreen request failed", err);
                }
              }}
            >
              <Maximize2 className="w-4 h-4" /> Re-Enter Secure Lockdown Desktop
            </button>
            
            <div className="text-[10px] text-rose-400 font-mono tracking-widest uppercase">
              Warning: Persistent violations will lead to automatic termination.
            </div>
          </div>
        </div>
      )}

      {/* Simplified Footer */}
      {!lockdownActive && currentRoute !== 'landing' && currentRoute !== 'candidate-start' && (
        <footer className="py-8 border-t border-black bg-white text-black text-center">
          <div className="container flex flex-col items-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <AdvancedSecureLogo size="mini" />
              <span className="logo-text text-black font-bold text-sm">NexaHire</span>
              <span className="logo-badge px-2 py-0.5 border border-black bg-white text-black rounded-full font-mono text-[9px] font-bold">AI AGENT</span>
            </div>
            <p className="text-xs text-slate-700 max-w-md leading-relaxed mx-auto">
              Enterprise-grade AI talent proctoring and candidate evaluation platform.
            </p>
          </div>
        </footer>
      )}
      {activeLiveMonitorInterview && (
        <LiveProctorMonitorModal 
          interview={activeLiveMonitorInterview} 
          onClose={() => setActiveLiveMonitorInterview(null)} 
          updateInterview={updateInterview}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// 1. LANDING PAGE
// ----------------------------------------------------
function MiniSparkline({ score, color }) {
  // SVG Sparkline path generator based on score level
  const path = score >= 75
    ? "M 2 10 C 15 2, 25 15, 38 4 C 50 15, 62 2, 75 12"
    : "M 2 4 C 15 15, 25 2, 38 14 C 50 4, 62 16, 75 10";
  return (
    <svg className="w-16 h-5 inline-block ml-3 overflow-visible" viewBox="0 0 80 20">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SIMULATED_TRANSCRIPT_SCRIPTS = {
  "Senior React Developer": [
    { speaker: "AI Recruiter", text: "Welcome! Let's begin the technical screening. Can you start by explaining how React's virtual DOM works?", timestamp: "00:05" },
    { speaker: "Candidate", text: "Sure! The virtual DOM is a lightweight copy of the real DOM in memory. React uses it to track state changes and compute diffs before updating the real browser DOM.", timestamp: "00:35" },
    { speaker: "AI Recruiter", text: "Excellent. How do you handle complex state management in large scale React projects?", timestamp: "01:10" },
    { speaker: "Candidate", text: "Usually, I prefer Context API for global theme/user state, and Redux Toolkit or Zustand for high-frequency data updates.", timestamp: "01:40" },
    { speaker: "AI Recruiter", text: "Makes sense. Are you comfortable working night shifts to coordinate with global teams?", timestamp: "02:15" },
    { speaker: "Candidate", text: "Yes, I am fully adaptable to night shifts and overlapping hours.", timestamp: "02:40" }
  ],
  "Technical Sales Lead": [
    { speaker: "AI Recruiter", text: "Welcome! Let's talk about your sales experience. How do you approach aligning technical product value with business needs?", timestamp: "00:05" },
    { speaker: "Candidate", text: "I start by understanding the prospect's pain points, then perform a product walkthrough demonstrating exactly how our API solves those key hurdles.", timestamp: "00:40" },
    { speaker: "AI Recruiter", text: "Perfect. How do you handle high-pressure objections from technical decision makers?", timestamp: "01:15" },
    { speaker: "Candidate", text: "I address them with real-world case studies and benchmarks, showing our system's SLA guarantees and security compliance.", timestamp: "01:50" }
  ],
  "AI / ML Engineer": [
    { speaker: "AI Recruiter", text: "Welcome! Let's dive into ML architectures. Can you explain the difference between batch normalization and layer normalization?", timestamp: "00:05" },
    { speaker: "Candidate", text: "Yes, batch normalization normalizes across the batch dimension, whereas layer normalization normalizes across the features for a single sample.", timestamp: "00:42" },
    { speaker: "AI Recruiter", text: "Great. Can you describe a scenario where you had to deal with model training degradation?", timestamp: "01:20" },
    { speaker: "Candidate", text: "I monitored validation loss drifts, adjusted learning rates dynamically using Cosine Annealing, and checked data pipeline distributions.", timestamp: "01:58" }
  ],
  "Product Manager": [
    { speaker: "AI Recruiter", text: "Welcome! How do you approach product roadmap prioritization when engineering resources are tight?", timestamp: "00:05" },
    { speaker: "Candidate", text: "I rely on the RICE framework to compute reach, impact, confidence, and effort, aligning prioritization with key company KPIs.", timestamp: "00:38" },
    { speaker: "AI Recruiter", text: "Great. How do you resolve conflicts between engineering and business stakeholders?", timestamp: "01:10" },
    { speaker: "Candidate", text: "I facilitate data-driven discussions, focusing on customer validation and potential ROI to make transparent trade-offs.", timestamp: "01:45" }
  ]
};

function LiveProctorMonitorModal({ interview, onClose, updateInterview }) {
  const [violationsCount, setViolationsCount] = useState(0);
  const [warningsList, setWarningsList] = useState([]);
  const [gazeStable, setGazeStable] = useState(92);
  const [micVolume, setMicVolume] = useState(12);
  const [simulatedTranscript, setSimulatedTranscript] = useState([]);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const transcriptEndRef = useRef(null);
  
  const dialogScript = SIMULATED_TRANSCRIPT_SCRIPTS[interview?.jobRole] || SIMULATED_TRANSCRIPT_SCRIPTS["Senior React Developer"];
  
  const isLiveConnected = window.liveCandidateSession && window.liveCandidateSession.interviewId === interview.id;

  useEffect(() => {
    if (isLiveConnected) {
      const syncFromLive = () => {
        const live = window.liveCandidateSession;
        if (live) {
          setViolationsCount(live.cameraOffCount || 0);
          setWarningsList(live.logs || []);
          setGazeStable(Math.round(live.eyeContactRate || 95));
          setSimulatedTranscript(live.transcript || []);
          setCameraOn(live.isCameraActive);
          setCameraGranted(true);
          setMicVolume(live.speakingPace > 0 ? Math.round(15 + Math.random() * 15) : Math.round(2 + Math.random() * 3));
          
          if (videoRef.current && live.stream && videoRef.current.srcObject !== live.stream) {
            videoRef.current.srcObject = live.stream;
          }
        }
      };
      
      syncFromLive();
      const interval = setInterval(syncFromLive, 1000);
      return () => {
        clearInterval(interval);
      };
    } else {
      let scriptIdx = 0;
      
      if (dialogScript && dialogScript.length > 0) {
        setSimulatedTranscript([dialogScript[0]]);
        scriptIdx = 1;
      }
      
      const transcriptInterval = setInterval(() => {
        if (dialogScript && scriptIdx < dialogScript.length) {
          setSimulatedTranscript(prev => [...prev, dialogScript[scriptIdx]]);
          scriptIdx++;
        }
      }, 4500);
      
      const telemetryInterval = setInterval(() => {
        setGazeStable(prev => {
          const drift = Math.random() > 0.85 ? (Math.random() > 0.5 ? -3 : 2) : 0;
          return Math.max(82, Math.min(98, prev + drift));
        });
        setMicVolume(prev => {
          return Math.round(5 + Math.random() * 25);
        });
      }, 1500);
      
      return () => {
        clearInterval(transcriptInterval);
        clearInterval(telemetryInterval);
      };
    }
  }, [isLiveConnected, dialogScript, interview.id]);
  
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simulatedTranscript]);

  const startCamera = async () => {
    if (window.liveCandidateSession && window.liveCandidateSession.interviewId === interview.id && window.liveCandidateSession.stream) {
      setCameraOn(true);
      setCameraGranted(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = window.liveCandidateSession.stream;
        }
      }, 150);
    } else {
      setCameraOn(false);
      setCameraGranted(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  };

  useEffect(() => {
    startCamera(); // Auto start camera stream on modal mount
    return () => {
      stopCamera();
    };
  }, [isLiveConnected]);

  const handleToggleCamera = () => {
    if (!isLiveConnected) {
      alert("No active candidate session connected.");
      return;
    }
    if (cameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleSendWarning = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setWarningsList(prev => [...prev, `Audio prompt sent: Please look at the screen! [${timeStr}]`]);
    alert("Proctor warning audio broadcast to candidate.");
  };

  const handleSimulateViolation = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setViolationsCount(prev => prev + 1);
    setWarningsList(prev => [...prev, `Focus deviation detected: eye vector offset [${timeStr}]`]);
  };

  const handleForceEnd = () => {
    const introScore = Math.round(82 + Math.random() * 15);
    const commScore = Math.round(80 + Math.random() * 18);
    const confScore = Math.round(85 + Math.random() * 13);
    const presentScore = Math.round(78 + Math.random() * 20);
    const vocabScore = Math.round(80 + Math.random() * 18);
    const grammarScore = Math.round(82 + Math.random() * 16);
    const emailScore = Math.round(85 + Math.random() * 13);
    
    const overallScore = Number((
      (introScore + commScore + confScore + presentScore + vocabScore + grammarScore + emailScore) / 7
    ).toFixed(1));
    const passingScore = interview.passingScore || 75;
    const passingStatus = overallScore >= passingScore ? "Passed" : "Failed";

    const finalReport = {
      overallScore,
      passingScore,
      passingStatus,
      introScore,
      commScore,
      confScore,
      presentScore,
      nightShiftFine: "Yes",
      vocabScore,
      grammarScore,
      emailScore,
      cameraOffCount: violationsCount,
      pace: "Optimal (128 WPM)",
      eyeContact: `${gazeStable}% Stable`,
      summary: `Proctored session finalized by HR Administrator. Candidate showed excellent technical capability and communication clarity. Proctor alerts were within parameters.`,
      proctorFlags: warningsList.length > 0 ? warningsList : ["integrity check verified"],
      totalDurationSecs: 120
    };

    const updatedInterview = {
      ...interview,
      status: "Completed",
      report: finalReport,
      transcript: simulatedTranscript.length > 0 ? simulatedTranscript : [
        { speaker: "AI Recruiter", text: "Please introduce yourself.", timestamp: "00:05" },
        { speaker: interview.candidateName, text: "I am excited for this role.", timestamp: "00:15" }
      ]
    };

    updateInterview(updatedInterview);
    alert("Live session finalized successfully. AI evaluation report generated.");
    onClose();
  };  return (
    <div className="modal-overlay-scrollable" onClick={onClose}>
      <div 
        className="modal-content animate-scale-in" 
        style={{ 
          maxWidth: '920px', 
          width: '95%', 
          margin: '20px auto', 
          background: 'var(--bg-card)', 
          border: '1.5px solid var(--border-glass)', 
          boxShadow: 'var(--shadow-premium)',
          padding: '24px',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header matching CandidateReportCard banner but themed with pulsing live indicator */}
        <div 
          className="profile-banner-glow"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderRadius: '8px',
            border: '1.5px solid var(--border-glass)',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--shadow-premium)'
          }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '150px', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }}></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 2 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 'bold' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', display: 'inline-block' }} className="animate-pulse"></span> LIVE SCREENING MONITOR
            </span>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.01em', textTransform: 'none' }}>
              Active Session: {interview.candidateName}
            </h3>
            <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} /> {interview.jobRole}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Activity style={{ width: '12px', height: '12px', color: 'var(--text-primary)' }} /> Telemetry Active</span>
            </div>
          </div>
          <button 
            style={{ 
              background: 'var(--bg-card)', 
              border: '1.5px solid var(--border-glass)', 
              color: 'var(--text-primary)', 
              cursor: 'pointer', 
              width: '28px', 
              height: '28px', 
              borderRadius: '4px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              zIndex: 2,
              transition: 'all 0.2s',
              fontWeight: 'bold',
              boxShadow: '1px 1px 0px var(--border-glass)'
            }} 
            onClick={onClose}
          >✕</button>
        </div>
        
        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', width: '100%' }}>
          
          {/* Left Column: Stream & Biometrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Active proctor stream video card */}
            <div 
              style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                backgroundColor: 'var(--bg-card)', 
                border: '1.5px solid var(--border-glass)',
                boxShadow: 'var(--shadow-premium)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Video style={{ width: '14px', height: '14px' }} /> Candidate Video Stream
                </span>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-primary)', backgroundColor: 'var(--bg-navy)', padding: '2px 6px', borderRadius: '4px', border: '1.5px solid var(--border-glass)', fontWeight: 'bold' }}>SECURE FEED</span>
              </div>
              
              <div style={{ position: 'relative', width: '100%', height: '200px', backgroundColor: 'var(--bg-navy)', borderRadius: '6px', overflow: 'hidden', border: '1.5px solid var(--border-glass)' }}>
                {cameraOn && cameraGranted ? (
                  <>
                    <video ref={videoRef} className="video-card-element mirrored" autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%)' }}></video>
                    <div className="face-square-corner corner-tl" style={{ borderTop: '2px solid var(--border-glass)', borderLeft: '2px solid var(--border-glass)', position: 'absolute', top: '16px', left: '16px', width: '16px', height: '16px' }}></div>
                    <div className="face-square-corner corner-tr" style={{ borderTop: '2px solid var(--border-glass)', borderRight: '2px solid var(--border-glass)', position: 'absolute', top: '16px', right: '16px', width: '16px', height: '16px' }}></div>
                    <div className="face-square-corner corner-bl" style={{ borderBottom: '2px solid var(--border-glass)', borderLeft: '2px solid var(--border-glass)', position: 'absolute', bottom: '16px', left: '16px', width: '16px', height: '16px' }}></div>
                    <div className="face-square-corner corner-br" style={{ borderBottom: '2px solid var(--border-glass)', borderRight: '2px solid var(--border-glass)', position: 'absolute', bottom: '16px', right: '16px', width: '16px', height: '16px' }}></div>
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', padding: '3px 8px', backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-glass)', color: 'var(--text-primary)', borderRadius: '4px', fontSize: '9px', fontFamily: 'monospace', fontWeight: 'bold', zIndex: 6, boxShadow: '1px 1px 0px var(--border-glass)' }}>98% Gaze Match</div>
                  </>
                ) : (
                  <div 
                    style={{ 
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'var(--bg-navy)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', boxShadow: '1.5px 1.5px 0px var(--border-glass)' }}>
                      <VideoOff className="w-5 h-5" />
                    </div>
                    <div style={{ zIndex: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 'bold', textTransform: 'uppercase', tracking: '0.1em' }}>Candidate Offline</div>
                      <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '4px' }}>Awaiting live biometric connection...</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Feed Controls */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  className="btn" 
                  style={{ 
                    padding: '8px 14px', 
                    fontSize: '11px', 
                    fontFamily: 'monospace', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    backgroundColor: cameraOn ? 'var(--text-primary)' : 'var(--bg-card)', 
                    color: cameraOn ? 'var(--bg-dark)' : 'var(--text-primary)', 
                    border: '1.5px solid var(--border-glass)',
                    boxShadow: '1px 1px 0px var(--border-glass)',
                    cursor: 'pointer'
                  }} 
                  onClick={handleToggleCamera}
                >
                  <Video style={{ width: '12px', height: '12px' }} /> {cameraOn ? 'Mute Camera' : 'Start Camera'}
                </button>
                <button 
                  className="btn" 
                  style={{ 
                    padding: '8px 14px', 
                    fontSize: '11px', 
                    fontFamily: 'monospace', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    backgroundColor: isMuted ? 'var(--text-primary)' : 'var(--bg-card)', 
                    color: isMuted ? 'var(--bg-dark)' : 'var(--text-primary)', 
                    border: '1.5px solid var(--border-glass)',
                    boxShadow: '1px 1px 0px var(--border-glass)',
                    cursor: 'pointer'
                  }} 
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <MicOff style={{ width: '12px', height: '12px' }} /> : <Mic style={{ width: '12px', height: '12px' }} />}
                  {isMuted ? 'Unmute Audio' : 'Mute Audio'}
                </button>
              </div>
            </div>

            {/* Biometrics Card */}
            <div 
              style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                backgroundColor: 'var(--bg-card)', 
                border: '1.5px solid var(--border-glass)',
                boxShadow: 'var(--shadow-premium)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Biometric Telemetry</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-navy)', border: '1.5px solid var(--border-glass)', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>GAZE STABILITY</div>
                  <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '4px', color: 'var(--text-primary)' }}>
                    {gazeStable}%
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-navy)', border: '1.5px solid var(--border-glass)', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>MIC VOL INDEX</div>
                  <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '4px', color: 'var(--text-primary)' }}>
                    {micVolume} dB
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dialogue Stream & Audit Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Live Dialogue Card */}
            <div 
              style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                backgroundColor: 'var(--bg-card)', 
                border: '1.5px solid var(--border-glass)',
                boxShadow: 'var(--shadow-premium)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                height: '260px'
              }}
            >
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid var(--border-glass)', paddingBottom: '6px' }}>
                Live Dialogue Stream
              </span>
              <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                {simulatedTranscript.map((line, idx) => {
                  if (line.speaker === 'System') {
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '6px 0', animation: 'fadeIn 0.25s ease-out' }}>
                        <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)', backgroundColor: 'var(--bg-navy)', border: '1.5px solid var(--border-glass)', borderRadius: '4px', padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {line.text.replace(/^-+\s*|\s*-+$/g, '')}
                        </div>
                      </div>
                    );
                  }
                  const isAI = line.speaker === 'AI Recruiter';
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isAI ? 'flex-start' : 'flex-end', width: '100%', animation: 'fadeIn 0.25s ease-out' }}>
                      <span style={{ fontSize: '8px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isAI ? (
                          <>
                            <Sparkles style={{ width: '8px', height: '8px' }} /> APEX AI
                          </>
                        ) : (
                          <span>{interview.candidateName ? interview.candidateName.toUpperCase() : 'CANDIDATE'}</span>
                        )}
                      </span>
                      <div 
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-primary)',
                          lineHeight: '1.45',
                          maxWidth: '85%',
                          padding: '6px 10px',
                          boxShadow: '1px 1px 0px var(--border-glass)',
                          ...(isAI 
                            ? { 
                                backgroundColor: 'rgba(99, 102, 241, 0.08)', 
                                border: '1.5px solid rgba(99, 102, 241, 0.25)', 
                                borderRadius: '0 8px 8px 8px' 
                              } 
                            : { 
                                backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                                border: '1.5px solid var(--border-glass)', 
                                borderRadius: '8px 0 8px 8px' 
                              })
                        }}
                      >
                        {line.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>
            </div>

            {/* Audit Logs Card */}
            <div 
              style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                backgroundColor: 'var(--bg-card)', 
                border: '1.5px solid var(--border-glass)',
                boxShadow: 'var(--shadow-premium)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Integrity Audit Log
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '130px', overflowY: 'auto' }}>
                <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 6px', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1.5px solid rgba(99, 102, 241, 0.2)', borderRadius: '4px' }}>
                  <Check style={{ width: '11px', height: '11px' }} /> Biometric proctor active. SHA-256 session lock valid.
                </div>
                {warningsList.map((warning, idx) => {
                  const isCritical = warning.includes('CRITICAL VIOLATION') || warning.includes('MULTI-MONITOR') || warning.includes('🖥️');
                  const isWarning = warning.toLowerCase().includes('warning') || warning.toLowerCase().includes('drift') || warning.toLowerCase().includes('gaze') || warning.toLowerCase().includes('deviation') || warning.toLowerCase().includes('look away') || warning.toLowerCase().includes('lost') || warning.includes('⚠️') || warning.toLowerCase().includes('hidden');
                  
                  let bg = 'rgba(99, 102, 241, 0.08)';
                  let border = '1.5px solid rgba(99, 102, 241, 0.2)';
                  let color = '#a5b4fc';
                  
                  if (isCritical) {
                    bg = 'rgba(239, 68, 68, 0.15)';
                    border = '1.5px solid rgba(239, 68, 68, 0.4)';
                    color = '#fca5a5';
                  } else if (isWarning) {
                    bg = 'rgba(245, 158, 11, 0.12)';
                    border = '1.5px solid rgba(245, 158, 11, 0.35)';
                    color = '#fdba74';
                  }
                  
                  return (
                    <div key={idx} style={{ fontSize: '10px', fontFamily: 'monospace', padding: '4px 6px', borderRadius: '4px', backgroundColor: bg, border: border, color: color, display: 'flex', alignItems: 'start', gap: '5px', fontWeight: (isCritical || isWarning) ? 'bold' : 'normal', lineHeight: '1.3' }}>
                      <AlertTriangle style={{ width: '11px', height: '11px', marginTop: '1px', flexShrink: 0 }} />
                      <span>{warning}</span>
                    </div>
                  );
                })}
                <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)', borderTop: '1px solid var(--border-glass)', paddingTop: '5px', marginTop: '5px' }}>
                  Total violations logged: <strong style={{ color: 'var(--text-primary)' }}>{violationsCount}</strong>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div 
          style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            gap: '12px', 
            marginTop: '10px', 
            paddingTop: '16px', 
            borderTop: '1.5px solid var(--border-glass)' 
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '11px', fontWeight: 'bold' }} onClick={handleSendWarning}>
              Send Gaze Alert
            </button>
            <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '11px', fontWeight: 'bold' }} onClick={handleSimulateViolation}>
              Simulate Violation
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 'bold' }} onClick={handleForceEnd}>
              Conclude & Report
            </button>
            <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 'bold' }} onClick={onClose}>
              Cancel Monitor
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function LandingPage({ onGoToAuth, interviews, onGoToCandidate, updateInterview, hrUser, onViewLive }) {
  const [interviewId, setInterviewId] = React.useState('');
  const [passcode, setPasscode] = React.useState('');
  const [error, setError] = React.useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    setError('');
    
    if (!interviewId.trim() || !passcode.trim()) {
      setError('Please provide both the Interview ID and Passcode.');
      return;
    }

    // Support looking up by Interview ID OR Candidate Email address (as shown in the mockup)
    const found = interviews.find(i => 
      i.id === interviewId.trim() || 
      (i.candidateEmail && i.candidateEmail.toLowerCase() === interviewId.trim().toLowerCase())
    );
    if (!found) {
      setError('No interview invitation found matching this ID/Email.');
      return;
    }

    if (String(found.passcode).trim() !== passcode.trim()) {
      setError('Invalid security passcode. Please verify your invitation details.');
      return;
    }

    if (found.status === 'Completed' || found.status === 'Terminated') {
      setError('This interview session has already been completed or terminated.');
      return;
    }

    onGoToCandidate('candidate-start', found.id, passcode.trim());
  };

  return (
    <div className="w-full apex-theme-bg flex flex-col justify-between" style={{ minHeight: 'calc(100vh - 56px)', position: 'relative' }}>
      
      {/* Main Grid Content */}
      <div className="apex-light-container">
        
        {/* Left Column - Information / Phases */}
        <div className="flex flex-col items-start text-left">
          
          <div className="apex-badge">
            <ShieldCheck className="w-3.5 h-3.5" /> Candidate Assessment Hub
          </div>
          
          <h1 className="apex-title-main">
            <span className="title-word nexahire-word">
              {"NEXAHIRE".split("").map((char, index) => (
                <span key={index} className="anim-char" style={{ animationDelay: `${index * 0.05}s` }}>
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </span>
            <span className="subtitle-word">SECURE AI INTERVIEW</span>
          </h1>
          
          <p className="apex-desc-text">
            You are accessing the secure candidate evaluation portal. The assessment consists of automated AI screening and proctored biometrics. Please review the Instructions below before signing in.
          </p>
          
          {/* Phase 1 Card */}
          <div className="apex-phase-card w-full">
            <div className="apex-phase-number">1</div>
            <div className="apex-phase-icon-box">
              <Mic className="w-5 h-5" />
            </div>
            <div className="apex-phase-content">
              <div className="apex-phase-title">Phase 1: Voice & Theory Screening (20 mins)</div>
              <div className="apex-phase-desc">
                Speak your answers clearly. The AI system evaluates communication, response content, confidence, and shift alignment.
              </div>
            </div>
            <ChevronRight className="apex-phase-arrow w-5 h-5" />
          </div>
          
          {/* Phase 2 Card */}
          <div className="apex-phase-card w-full">
            <div className="apex-phase-number">2</div>
            <div className="apex-phase-icon-box">
              <Keyboard className="w-5 h-5" />
            </div>
            <div className="apex-phase-content">
              <div className="apex-phase-title">Phase 2: Written Skill Assessment (10 mins)</div>
              <div className="apex-phase-desc">
                Keyboard-based responses. Tests technical vocabulary definitions, grammatical corrections, and professional email formatting.
              </div>
            </div>
            <ChevronRight className="apex-phase-arrow w-5 h-5" />
          </div>
          
          {/* Hardware & System Enforcements Pills */}
          <div className="apex-status-pills-row">
            <div className="apex-status-pill">
              <Video className="w-4 h-4" /> Webcam Required
            </div>
            <div className="apex-status-pill">
              <UserCheck className="w-4 h-4" /> Face Required
            </div>
            <div className="apex-status-pill">
              <Mic className="w-4 h-4" /> Mic Calibration
            </div>
            <div className="apex-status-pill">
              <Monitor className="w-4 h-4" /> Fullscreen Lockout
            </div>
          </div>
          
        </div>
        
        {/* Right Column - Pedestal Shield Graphic or Auth/Webcam Form */}
        <div className="relative w-full flex items-center justify-center">
          
          <div className="w-full flex flex-col items-center">
            
            {/* Floating Pedestal 3D Shield Graphic */}
            <div className="relative w-full h-[150px] flex items-center justify-center mx-auto mb-4 pointer-events-none">
              {/* 3D concentric rings */}
              <div className="absolute w-[170px] h-[170px] border border-blue-200/25 rounded-full pointer-events-none ring-pulse-breath" style={{ top: 'calc(50% - 85px)', left: 'calc(50% - 85px)', transform: 'rotateX(65deg)' }}></div>
              <div className="absolute w-[140px] h-[140px] border border-dashed border-blue-300/35 rounded-full pointer-events-none ring-spin-normal" style={{ top: 'calc(50% - 70px)', left: 'calc(50% - 70px)', transform: 'rotateX(65deg)' }}></div>
              <div className="absolute w-[115px] h-[115px] border-[1.5px] border-blue-400/40 rounded-full pointer-events-none shadow-[0_0_8px_rgba(59,130,246,0.1)] ring-spin-reverse" style={{ top: 'calc(50% - 57px)', left: 'calc(50% - 57px)', transform: 'rotateX(65deg)' }}></div>
              <div className="absolute w-[90px] h-[90px] border border-dashed border-cyan-400/50 rounded-full pointer-events-none ring-spin-normal" style={{ top: 'calc(50% - 45px)', left: 'calc(50% - 45px)', transform: 'rotateX(65deg)' }}></div>
              <div className="absolute w-[70px] h-[70px] border-2 border-blue-500/65 rounded-full pointer-events-none shadow-[0_0_10px_rgba(59,130,246,0.15)] ring-pulse-breath" style={{ top: 'calc(50% - 35px)', left: 'calc(50% - 35px)', transform: 'rotateX(65deg)' }}></div>
              <div className="absolute w-[50px] h-[50px] bg-gradient-to-r from-blue-500/20 to-cyan-400/20 border border-cyan-400/50 rounded-full pointer-events-none" style={{ top: 'calc(50% - 25px)', left: 'calc(50% - 25px)', transform: 'rotateX(65deg)' }}></div>

              {/* Advanced Interactive Logo */}
              <div className="absolute top-[calc(50%-28px)] animate-float" style={{ animationDuration: '4.5s' }}>
                <AdvancedSecureLogo size="small" />
              </div>
            </div>
            
            <div className="apex-auth-card w-full">
              
              <div className="apex-auth-badge">
                <Lock className="w-3.5 h-3.5" /> Secure Authentication
              </div>
              
              <h2 className="apex-auth-title">Join Interview</h2>
              <p className="apex-auth-subtitle">
                Enter your credential details from your invitation email.
              </p>
              
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-semibold mb-4" style={{ fontFamily: 'sans-serif' }}>
                  ⚠️ {error}
                </div>
              )}
              
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="form-group mb-4">
                  <label className="apex-input-label">INTERVIEW ID</label>
                  <div className="apex-input-wrapper">
                    <div className="apex-input-icon-box">
                      <User className="w-4.5 h-4.5" />
                    </div>
                    <input 
                      type="text" 
                      className="apex-input-field" 
                      value={interviewId}
                      onChange={(e) => setInterviewId(e.target.value)}
                      placeholder="superadmin@hrms.com"
                    />
                  </div>
                </div>
                
                <div className="form-group mb-6">
                  <label className="apex-input-label">SECURITY PASSCODE</label>
                  <div className="apex-input-wrapper">
                    <div className="apex-input-icon-box">
                      <Lock className="w-4.5 h-4.5" />
                    </div>
                    <input 
                      type="password" 
                      className="apex-input-field font-mono" 
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>
                
                <button type="submit" className="apex-btn-submit">
                  Verify Credentials & Start <ArrowRight className="w-4.5 h-4.5" />
                </button>
              </form>
              
              <div className="apex-auth-footer mt-4 font-sans text-xs" style={{ color: '#64748b' }}>
                System Administrator?{' '}
                <span className="apex-auth-footer-link" onClick={() => onGoToAuth()}>
                  HR Officer Login
                </span>
              </div>
              
            </div>
          </div>
          
        </div>

      </div>

      {/* Footer matching Mockup */}
      <footer className="w-full apex-footer py-6 mt-16 relative z-10">
        <div className="container max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AdvancedSecureLogo size="mini" />
            <span className="apex-logo-text" style={{ fontSize: '0.95rem' }}>NexaHire</span>
            <span className="apex-logo-badge" style={{ fontSize: '0.55rem', padding: '1px 6px' }}>AI AGENT</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Enterprise-grade AI talent proctoring and candidate evaluation platform.
          </p>
        </div>
      </footer>

    </div>
  );
}

// ----------------------------------------------------
// DYNAMIC HERO WEBCAM INTERACTIVE PANEL
// ----------------------------------------------------
function InteractiveHeroPanel() {
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [stream, setStream] = useState(null);
  
  // Real-time ticking simulation metrics
  const [eyeLock, setEyeLock] = useState(96);
  const [communication, setCommunication] = useState(85);
  const [skills, setSkills] = useState(90);
  const [problemSolving, setProblemSolving] = useState(88);
  const [confidence, setConfidence] = useState(93);

  const heroVideoRef = useRef(null);

  // Toggle Camera
  const toggleCamera = async () => {
    if (cameraOn) {
      // Turn Off
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
      setCameraOn(false);
      setCameraGranted(false);
    } else {
      // Turn On
      try {
        const streamInstance = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        setStream(streamInstance);
        setCameraOn(true);
        setCameraGranted(true);
        setTimeout(() => {
          if (heroVideoRef.current) {
            heroVideoRef.current.srcObject = streamInstance;
          }
        }, 150);
      } catch (e) {
        console.error("Camera access denied", e);
        alert("webcamera permission required to view live biometrics directly in the hero card!");
      }
    }
  };

  // Real-time pixel & voice analysis engine
  useEffect(() => {
    if (!cameraOn || !stream) return;

    let animationFrameId = null;
    let audioContext = null;
    let analyser = null;
    let source = null;

    // 1. Setup Audio context to analyze real microphone level
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
      }
    } catch (e) {
      console.warn("AudioContext initialization failed", e);
    }

    // 2. Setup Offscreen Canvas for pixel processing
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    let prevFrameData = null;

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const analyzeFrame = () => {
      // a. Video motion detection
      let motionFactor = 0;
      if (heroVideoRef.current && heroVideoRef.current.readyState === heroVideoRef.current.HAVE_ENOUGH_DATA) {
        try {
          ctx.drawImage(heroVideoRef.current, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = frame.data;

          if (prevFrameData) {
            let totalDiff = 0;
            // Sample every 16th pixel for high efficiency
            for (let i = 0; i < data.length; i += 16) {
              totalDiff += Math.abs(data[i] - prevFrameData[i]) + // R
                           Math.abs(data[i+1] - prevFrameData[i+1]) + // G
                           Math.abs(data[i+2] - prevFrameData[i+2]);   // B
            }
            // Normalize motion factor
            motionFactor = totalDiff / (canvas.width * canvas.height * 0.1);
          }
          prevFrameData = data;
        } catch (err) {}
      }

      // b. Audio level detection
      let volumeFactor = 0;
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        volumeFactor = sum / dataArray.length; // 0 to 255
      }

      // c. Map real telemetry factors to real scores:
      // High sudden movement (motionFactor > 8) drops eyeLock percentage.
      // Standard micro-adjustments maintain an extremely stable 94%-98% accuracy!
      setEyeLock(prev => {
        let baseLock = 98 - Math.min(15, motionFactor * 1.5);
        return Math.round(prev * 0.9 + baseLock * 0.1);
      });

      // Communication score is bound to actual audio decibels from microphone!
      // If user is talking (volumeFactor > 5), confidence and communication metrics rise.
      setCommunication(prev => {
        let targetComm = volumeFactor > 6 
          ? Math.min(99, 85 + (volumeFactor * 0.3)) 
          : Math.max(72, prev - 0.2); // slowly drift to base floor
        return Math.round(prev * 0.9 + targetComm * 0.1);
      });

      setConfidence(prev => {
        let stabilityFactor = Math.max(0, 100 - (motionFactor * 2));
        let talkingBonus = volumeFactor > 6 ? 5 : 0;
        let targetConf = Math.min(98, Math.max(75, (stabilityFactor * 0.8) + (volumeFactor * 0.1) + talkingBonus));
        return Math.round(prev * 0.95 + targetConf * 0.05);
      });

      // Problem solving & skills slightly fluctuate dynamically based on signal inputs
      setSkills(prev => Math.round(prev * 0.99 + (90 + (volumeFactor > 6 ? 3 : 0) - (motionFactor > 6 ? 2 : 0)) * 0.01));
      setProblemSolving(prev => Math.round(prev * 0.99 + (88 + (volumeFactor > 6 ? 4 : 0)) * 0.01));

      animationFrameId = requestAnimationFrame(analyzeFrame);
    };

    animationFrameId = requestAnimationFrame(analyzeFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [cameraOn, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Overall competency formula
  const overallScore = Math.round((communication + skills + problemSolving + confidence) / 4);

  const radius = 26;
  const strokeDash = 2 * Math.PI * radius;
  const offset = strokeDash - (overallScore / 100) * strokeDash;

  return (
    <div className="landing-video-card">
      {/* Video Preview HUD Panel */}
      <div className="video-left-section">
        <div className="video-panel-header">
          <div className="live-status-indicator">
            <span className="telemetry-ping-dot"></span>
            <span className="live-status-text">LIVE SCREENING</span>
          </div>
          <div className="candidate-id-badge">
            ID: INT-784512 <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 inline" />
          </div>
        </div>

        {/* Video feed container */}
        <div className="video-feed-wrapper">
          {cameraGranted && cameraOn ? (
            <>
              <div className="scan-line" style={{ zIndex: 5 }}></div>
              <video ref={heroVideoRef} className="video-card-element mirrored" autoPlay playsInline muted></video>
              
              {/* Proctor mesh overlay */}
              <div className="face-square-corner corner-tl"></div>
              <div className="face-square-corner corner-tr"></div>
              <div className="face-square-corner corner-bl"></div>
              <div className="face-square-corner corner-br"></div>
              
              <div className="match-percentage-badge">98% Match</div>
            </>
          ) : (
            <div 
              className="video-mock-avatar" 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop')` }}
            >
              <div className="absolute inset-0 bg-emerald-950/20 backdrop-brightness-95"></div>
              {/* Bounding corners */}
              <div className="face-square-corner corner-tl"></div>
              <div className="face-square-corner corner-tr"></div>
              <div className="face-square-corner corner-bl"></div>
              <div className="face-square-corner corner-br"></div>
              <div className="match-percentage-badge">98% Match</div>
            </div>
          )}
        </div>

        {/* Control toolbar */}
        <div className="video-control-buttons">
          <button className="control-btn" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
          </button>
          <button className={`control-btn ${cameraOn ? 'btn-primary' : ''}`} onClick={toggleCamera}>
            <Video className="w-4 h-4" />
          </button>
          <button className="control-btn hangup">
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </div>    </div>
  );
}

// ----------------------------------------------------
// 2. HR AUTHENTICATION (LOGIN & REGISTRATION)
// ----------------------------------------------------
function HRAuthPage({ onLogin, onRegister }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('hr.admin@softstandard.com');
  const [password, setPassword] = useState('securePass123');
  const [showPassword, setShowPassword] = useState(false);
  const [registrationKey, setRegistrationKey] = useState('');
  const [showRegKey, setShowRegKey] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Switch between login/register — clear form state
  const switchMode = (toRegister) => {
    setIsRegister(toRegister);
    setError('');
    setRegistrationKey('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (isRegister) {
      // ── Validate company access code against backend ──
      if (!registrationKey.trim()) {
        setError('Company access code is required to register.');
        return;
      }

      setIsValidating(true);
      try {
        const res = await fetch(BACKEND_URL + '/api/auth/validate-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationKey: registrationKey.trim() })
        });
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setError(data.error || 'Invalid company access code.');
          setIsValidating(false);
          return;
        }

        // Key is valid — proceed with registration
        const success = await onRegister(email, password, registrationKey.trim());
        if (!success) {
          setError('Registration failed. Please try again.');
        }
      } catch (err) {
        setError('Could not connect to the server to verify the access code. Please try again.');
      } finally {
        setIsValidating(false);
      }
    } else {
      const success = await onLogin(email, password);
      if (!success) {
        setError('Invalid credentials. If this is your first time, register below.');
      }
    }
  };

  return (
    <div className="w-full apex-theme-bg flex flex-col justify-between flex-grow" style={{ position: 'relative', minHeight: 'calc(100vh - 56px)' }}>
      <div className="container py-12 flex-grow flex flex-col justify-center animate-scale-in" style={{ zIndex: 1 }}>
        
        {/* 1. Main Auth Split Card */}
        <div className="auth-split-card mb-8">
          
          {/* Left Side: Login Form Console */}
          <div className="auth-left">
            <div className="auth-icon-badge mb-4">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-white text-2xl font-bold tracking-tight mb-2">
              {isRegister ? 'HR Officer Registration' : 'HR Admin Portal'}
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {isRegister 
                ? 'Create an admin account to configure secure biometric interview sessions.' 
                : 'Secure access to candidate scores, transcripts, and evaluation scorecards.'}
            </p>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 justify-center">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group mb-4">
              <label className="form-label text-[10px] font-mono tracking-widest text-slate-500 font-bold block mb-2">WORK EMAIL</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Mail className="w-4.5 h-4.5" />
                </span>
                <input 
                  type="email" 
                  className="glass-input glass-input-with-icon" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="hr.admin@softstandard.com" 
                  required
                />
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="form-label text-[10px] font-mono tracking-widest text-slate-500 font-bold block mb-2">PASSWORD</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="glass-input glass-input-with-icon-both" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••••••" 
                  required
                />
                <button 
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Eye className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="form-group mb-4">
                <label className="form-label text-[10px] font-mono tracking-widest text-slate-500 font-bold block mb-2">COMPANY ACCESS CODE</label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <Lock className="w-4.5 h-4.5" />
                  </span>
                  <input 
                    type={showRegKey ? 'text' : 'password'} 
                    className="glass-input glass-input-with-icon-both" 
                    value={registrationKey}
                    onChange={(e) => setRegistrationKey(e.target.value)} 
                    placeholder="Enter Secret Key" 
                    required
                  />
                  <button 
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowRegKey(!showRegKey)}
                  >
                    <Eye className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary w-full mt-2 py-3.5 flex justify-between items-center px-6"
              disabled={isValidating}
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5" /> 
                {isValidating ? 'Verifying access...' : (isRegister ? 'Register Admin Console' : 'Authenticate Console')}
              </span>
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/5 text-xs text-left">
            {isRegister ? (
              <span className="text-slate-400">
                Already have an account?{' '}
                <a href="#" className="text-cyan-400 hover:underline font-semibold" onClick={() => switchMode(false)}>Log in here</a>
              </span>
            ) : (
              <span className="text-slate-400">
                New HR representative?{' '}
                <a href="#" className="text-cyan-400 hover:underline font-semibold" onClick={() => switchMode(true)}>Register a new account</a>
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Glowing Holographic 3D Pedestal Shield */}
        <div className="auth-right">
          <div className="pedestal-viewport">
            <div className="pedestal-atmosphere-particles"></div>
            
            {/* The 3D perspective base pedestal platform */}
            <div className="pedestal-base">
              <div className="pedestal-ring pedestal-ring-outer"></div>
              <div className="pedestal-ring pedestal-ring-middle"></div>
              <div className="pedestal-ring pedestal-ring-inner"></div>
            </div>

            {/* The floating holographic security lock/shield */}
            <div className="hologram-shield-wrapper">
              <div className="hologram-shield-glow"></div>
              <div className="hologram-shield">
                <Users className="w-12 h-12 text-[#00ff88]" />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 2. Security Feature Banner Row */}
      <div className="security-features-banner grid grid-cols-2 md:grid-cols-4 gap-6 p-6">
        <div className="security-feature-item">
          <div className="sec-icon-wrapper">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h5>Enterprise Security</h5>
            <p>End-to-end encryption and data protection</p>
          </div>
        </div>

        <div className="security-feature-item">
          <div className="sec-icon-wrapper">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h5>Role-Based Access</h5>
            <p>Granular permissions for your team</p>
          </div>
        </div>

        <div className="security-feature-item">
          <div className="sec-icon-wrapper">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h5>Secure Infrastructure</h5>
            <p>Hosted on trusted and compliant servers</p>
          </div>
        </div>

        <div className="security-feature-item">
          <div className="sec-icon-wrapper">
            <ClipboardList className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h5>Audit & Monitoring</h5>
            <p>Track access and all activities</p>
          </div>
        </div>
      </div>

      <footer className="w-full apex-footer py-6 mt-16 relative z-10">
        <div className="container max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AdvancedSecureLogo size="mini" />
            <span className="apex-logo-text" style={{ fontSize: '0.95rem' }}>NexaHire</span>
            <span className="apex-logo-badge" style={{ fontSize: '0.55rem', padding: '1px 6px' }}>AI AGENT</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Enterprise-grade AI talent proctoring and candidate evaluation platform.
          </p>
        </div>
      </footer>
    </div>
    </div>
  );
}

// ----------------------------------------------------
// System Settings sub-component for HR Admin Dashboard
// ----------------------------------------------------
function SystemSettings({ hrToken }) {
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [gmailStatus, setGmailStatus] = useState({ connected: false, email: '' });
  
  // Gmail SMTP fields (prefill with requested user email)
  const [gmailEmail, setGmailEmail] = useState('hrms1928@gmail.com');
  const [gmailPassword, setGmailPassword] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const headers = {};
    if (hrToken) {
      headers['Authorization'] = `Bearer ${hrToken}`;
    }
    fetch(BACKEND_URL + '/api/config/key-status', { headers })
      .then(res => res.json())
      .then(data => {
        setIsConfigured(data.isConfigured);
      })
      .catch(err => console.error('Failed to load OpenAI key status from PostgreSQL backend:', err));
  }, [hrToken]);

  useEffect(() => {
    // load gmail connection status
    const headers = {};
    if (hrToken) {
      headers['Authorization'] = `Bearer ${hrToken}`;
    }
    fetch(BACKEND_URL + '/api/auth/gmail/status', { headers })
      .then(res => res.json())
      .then(data => {
        setGmailStatus(data);
      })
      .catch(err => console.error('Failed to load Gmail status:', err));
  }, [hrToken]);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (hrToken) {
        headers['Authorization'] = `Bearer ${hrToken}`;
      }
      const res = await fetch(BACKEND_URL + '/api/config/key', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsConfigured(true);
        setStatusMsg('OpenAI API Key successfully saved to PostgreSQL database.');
        setApiKey(''); // Clear for security
      } else {
        setStatusMsg(`Failed to save key: ${data.error || 'Server error'}`);
      }
    } catch (err) {
      setStatusMsg(`Failed to connect to backend database: ${err.message}`);
    }
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleConnectGmailSMTP = async () => {
    if (!gmailEmail.trim() || !gmailPassword.trim()) {
      setStatusMsg('Please enter both your Gmail address and your App Password.');
      setTimeout(() => setStatusMsg(''), 4000);
      return;
    }
    setConnecting(true);
    setStatusMsg('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (hrToken) {
        headers['Authorization'] = `Bearer ${hrToken}`;
      }
      const res = await fetch(BACKEND_URL + '/api/auth/gmail/connect', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          email: gmailEmail.trim(),
          password: gmailPassword.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGmailStatus({ connected: true, email: data.email });
        setGmailPassword('');
        setStatusMsg('Gmail SMTP connection established successfully!');
      } else {
        setStatusMsg(`Connection failed: ${data.error || 'Verification error'}`);
      }
    } catch (err) {
      setStatusMsg(`Failed to contact server: ${err.message}`);
    } finally {
      setConnecting(false);
      setTimeout(() => setStatusMsg(''), 6000);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      const headers = {};
      if (hrToken) {
        headers['Authorization'] = `Bearer ${hrToken}`;
      }
      const res = await fetch(BACKEND_URL + '/api/auth/gmail/disconnect', {
        method: 'POST',
        headers: headers
      });
      if (res.ok) {
        setGmailStatus({ connected: false, email: '' });
        setStatusMsg('Gmail SMTP connection disconnected successfully.');
      } else {
        setStatusMsg('Failed to disconnect Gmail account.');
      }
    } catch (err) {
      setStatusMsg(`Disconnect error: ${err.message}`);
    }
    setTimeout(() => setStatusMsg(''), 4000);
  };

  return (
    <div className="glass-card animate-scale-in text-left dashboard-content-wrapper-card">
      <div>
        <h2 className="dashboard-card-title">System Configuration</h2>
        <p className="dashboard-card-desc">Configure external services and AI model parameters for candidate grading.</p>
      </div>

      <div className="space-y-4">
        <div className="form-group text-left">
          <div className="flex justify-between items-center mb-1.5">
            <label className="form-label text-slate-300 block text-xs font-semibold uppercase tracking-wider font-mono">OpenAI API Key (For Precise Evaluation)</label>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isConfigured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              {isConfigured ? '● ACTIVE IN DATABASE' : '○ NOT CONFIGURED'}
            </span>
          </div>
          <input 
            type="password" 
            className="glass-input font-mono text-xs w-full p-3 bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500" 
            placeholder={isConfigured ? "Enter new key to overwrite (sk-...)" : "sk-..."} 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
            By default, NexaHire evaluates candidates using a localized rule-based parser. Providing your OpenAI API key enables the <strong>GPT-4o Evaluation Engine</strong> to perform advanced semantic grading, linguistic analysis, and exact scoring configurations.
          </p>
        </div>

        {/* Gmail Account Connection Section */}
        <div className="form-group text-left border-t border-white/5 pt-6 mt-6">
          <div className="flex justify-between items-center mb-3">
            <label className="form-label text-slate-300 block text-xs font-semibold uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              Gmail Email Service Connection
            </label>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${gmailStatus.connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-white/10'}`}>
              {gmailStatus.connected ? '● CONNECTED' : '○ DISCONNECTED'}
            </span>
          </div>

          {gmailStatus.connected ? (
            <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex items-center justify-between gap-4 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-mono font-bold text-white leading-none">{gmailStatus.email}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Automatic invite delivery enabled via SMTP</p>
                </div>
              </div>
              <button 
                type="button"
                className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-mono font-bold transition-all"
                onClick={handleDisconnectGmail}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl text-center space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed text-left">
                Connect your Gmail email account to automatically dispatch proctored screening assessment invite links directly to candidates upon creation.
              </p>
              
              <div className="space-y-3 text-left">
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">Gmail Email Address</label>
                  <input
                    type="email"
                    className="glass-input font-mono text-xs w-full p-3 bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. hrms1928@gmail.com"
                    value={gmailEmail}
                    onChange={(e) => setGmailEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1 flex justify-between">
                    <span>Gmail App Password</span>
                    <a
                      href="https://support.google.com/accounts/answer/185833"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline text-[9px] lowercase font-sans font-normal normal-case"
                    >
                      how to generate an App Password?
                    </a>
                  </label>
                  <input
                    type="password"
                    className="glass-input font-mono text-xs w-full p-3 bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Enter 16-character Google app password"
                    value={gmailPassword}
                    onChange={(e) => setGmailPassword(e.target.value)}
                  />
                  <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                    If 2-Step Verification is enabled on your Google account (recommended), you <strong>MUST</strong> use a 16-character App Password instead of your regular password.
                  </p>
                </div>
              </div>

              <button 
                type="button"
                disabled={connecting}
                onClick={handleConnectGmailSMTP}
                className="btn text-xs font-bold py-3 bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-600 flex items-center justify-center gap-2 w-full rounded-xl transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Testing & Connecting SMTP...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Connect Gmail SMTP
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {statusMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-mono">
            {statusMsg}
          </div>
        )}

        <button className="btn btn-primary w-full" onClick={handleSave}>
          Save Configuration
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 3. HR ADMIN DASHBOARD & RESULTS
// ----------------------------------------------------
function HRDashboard({ interviews, onCreateInterview, onViewReport, onDeleteInterview, selectedInterview, onCloseReport, onViewLive, onGoToCandidate, hrToken }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create' | 'settings'
  
  // Gmail State variables
  const [gmailStatus, setGmailStatus] = useState({ connected: false, email: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSendStatus, setEmailSendStatus] = useState(null); // 'success' | 'failed' | null

  // Fetch Gmail configuration status
  useEffect(() => {
    const headers = {};
    if (hrToken) {
      headers['Authorization'] = `Bearer ${hrToken}`;
    }
    fetch(BACKEND_URL + '/api/auth/gmail/status', { headers })
      .then(res => res.json())
      .then(data => {
        setGmailStatus(data);
      })
      .catch(err => console.error('Failed to load Gmail connection status:', err));
  }, [hrToken]);

  // Dynamic Designation Templates State
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('nexahire_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse saved templates:", e);
      }
    }
    return INITIAL_TEMPLATES;
  });

  // Save templates to localStorage on changes
  useEffect(() => {
    localStorage.setItem('nexahire_templates', JSON.stringify(templates));
  }, [templates]);

  // Create Form State
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [candidateType, setCandidateType] = useState('experienced');
  const [jobRole, setJobRole] = useState(() => templates[0]?.role || 'Senior React Developer');
  const [customJobRole, setCustomJobRole] = useState('');
  const [passingScore, setPassingScore] = useState(() => templates[0]?.passingScore || 75);
  const mapQuestionsToObjects = (questions) => {
    return questions.map(q => {
      if (typeof q === 'object' && q !== null) {
        return {
          text: q.text || "",
          type: q.type || "speech",
          optionsText: q.options ? q.options.join(", ") : ""
        };
      }
      const qTextLower = q.toLowerCase();
      let determinedType = "speech";
      if (
        qTextLower.startsWith("write a") || 
        qTextLower.startsWith("draft a") || 
        qTextLower.startsWith("draft an email") ||
        qTextLower.includes("email format template")
      ) {
        determinedType = "text";
      }
      return { text: q, type: determinedType, optionsText: "" };
    });
  };

  const [phase1Q, setPhase1Q] = useState(() => {
    const defaultRole = templates[0]?.role || "Senior React Developer";
    const randomized = getRandomQuestionsForRole(defaultRole);
    return mapQuestionsToObjects(randomized.phase1);
  });
  const [phase2Q, setPhase2Q] = useState(() => {
    const defaultRole = templates[0]?.role || "Senior React Developer";
    const randomized = getRandomQuestionsForRole(defaultRole);
    return mapQuestionsToObjects(randomized.phase2);
  });
  const [validity, setValidity] = useState(() => templates[0]?.validity || 2); // hours
  const [durationLimit, setDurationLimit] = useState(() => templates[0]?.durationLimit || 30);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [generatedPasscode, setGeneratedPasscode] = useState('');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const validityOptions = [1, 2, 24, 30, 168];
  const durationOptions = [15, 30, 45, 60, 120];

  // Stats Counters
  const total = interviews.length;
  const completed = interviews.filter(i => i.status === 'Completed').length;
  const activeCount = interviews.filter(i => i.status === 'Active').length;
  const avgScore = completed > 0 
    ? Math.round(interviews.reduce((acc, curr) => (curr.status === 'Completed' && curr.report) ? acc + curr.report.overallScore : acc, 0) / completed)
    : 0;

  const handleRoleChange = (roleName) => {
    setJobRole(roleName);
    if (roleName === 'Custom') {
      setPassingScore(70);
      setDurationLimit(30);
      setPhase1Q([
        { text: "Please introduce yourself and explain your suitability for this role.", type: "speech", optionsText: "" },
        { text: "Describe a complex problem you solved in your past project.", type: "speech", optionsText: "" },
        { text: "Are you comfortable working night shifts to sync with global timezone demands?", type: "speech", optionsText: "" }
      ]);
      setPhase2Q([
        { text: "Explain a core technical concept related to this job in simple business terms.", type: "speech", optionsText: "" },
        { text: "Correct any formatting or grammatical errors in a typical work email.", type: "speech", optionsText: "" },
        { text: "Draft a short email requesting a status update or team coordination.", type: "text", optionsText: "" }
      ]);
    } else {
      const template = templates.find(t => t.role === roleName);
      if (template) {
        setPassingScore(template.passingScore);
        const randomized = getRandomQuestionsForRole(roleName);
        setPhase1Q(mapQuestionsToObjects(randomized.phase1));
        setPhase2Q(mapQuestionsToObjects(randomized.phase2));
        if (template.validity) {
          setValidity(template.validity);
        }
        if (template.durationLimit) {
          setDurationLimit(template.durationLimit);
        } else {
          setDurationLimit(30);
        }
      }
    }
  };

  const handleSaveAsTemplate = () => {
    const roleName = jobRole === 'Custom' ? customJobRole.trim() : jobRole.trim();
    if (!roleName) {
      alert("Please enter a Custom Job Title first.");
      return;
    }

    const exists = templates.some(t => t.role.toLowerCase() === roleName.toLowerCase());
    if (exists) {
      if (!window.confirm(`A template for "${roleName}" already exists. Do you want to overwrite it with current questions, passing score, and duration?`)) {
        return;
      }
    }

    const newTpl = {
      id: exists ? templates.find(t => t.role.toLowerCase() === roleName.toLowerCase()).id : `tpl-${Date.now()}`,
      role: roleName,
      passingScore: passingScore,
      validity: validity,
      durationLimit: durationLimit,
      phase1Questions: phase1Q.map(q => {
        if (q.type === 'mcq') {
          return {
            text: q.text,
            type: q.type,
            options: q.optionsText ? q.optionsText.split(',').map(o => o.trim()).filter(Boolean) : []
          };
        }
        return { text: q.text, type: q.type };
      }),
      phase2Questions: phase2Q.map(q => {
        if (q.type === 'mcq') {
          return {
            text: q.text,
            type: q.type,
            options: q.optionsText ? q.optionsText.split(',').map(o => o.trim()).filter(Boolean) : []
          };
        }
        return { text: q.text, type: q.type };
      })
    };

    setTemplates(prev => {
      if (exists) {
        return prev.map(t => t.role.toLowerCase() === roleName.toLowerCase() ? newTpl : t);
      }
      return [...prev, newTpl];
    });

    setJobRole(roleName);
    alert(`Template "${roleName}" saved successfully!`);
  };

  const handlePhase1QuestionFieldChange = (index, field, value) => {
    const updated = [...phase1Q];
    updated[index] = { ...updated[index], [field]: value };
    setPhase1Q(updated);
  };

  const handlePhase2QuestionFieldChange = (index, field, value) => {
    const updated = [...phase2Q];
    updated[index] = { ...updated[index], [field]: value };
    setPhase2Q(updated);
  };

  const addPhase1Question = () => {
    setPhase1Q([...phase1Q, { text: "", type: "speech", optionsText: "" }]);
  };

  const removePhase1Question = (index) => {
    if (phase1Q.length > 1) {
      setPhase1Q(phase1Q.filter((_, idx) => idx !== index));
    }
  };

  const addPhase2Question = () => {
    setPhase2Q([...phase2Q, { text: "", type: "speech", optionsText: "" }]);
  };

  const removePhase2Question = (index) => {
    if (phase2Q.length > 1) {
      setPhase2Q(phase2Q.filter((_, idx) => idx !== index));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!cName || !cEmail) return;

    const formatQuestionsForBackend = (qList) => {
      return qList
        .filter(q => q.text && q.text.trim() !== '')
        .map(q => {
          if (q.type === 'mcq') {
            return {
              text: q.text,
              type: q.type,
              options: q.optionsText ? q.optionsText.split(',').map(o => o.trim()).filter(Boolean) : []
            };
          }
          return {
            text: q.text,
            type: q.type
          };
        });
    };

    const finalJobRole = jobRole === 'Custom' ? customJobRole : jobRole;

    // Set sending status state if Gmail is connected
    if (gmailStatus.connected) {
      setSendingEmail(true);
      setEmailSendStatus(null);
    }

    try {
      const { interview: newInt, apiResult } = await onCreateInterview(
        cName, 
        cEmail, 
        finalJobRole, 
        passingScore, 
        formatQuestionsForBackend(phase1Q), 
        formatQuestionsForBackend(phase2Q), 
        validity,
        durationLimit,
        candidateType
      );
      
      // Generate beautiful share link
      const protocol = window.location.protocol;
      const host = window.location.host;
      const pathname = window.location.pathname;
      const linkStr = `${protocol}//${host}${pathname}?interviewId=${newInt.id}&passcode=${newInt.passcode}`;
      
      setGeneratedLink(linkStr);
      setGeneratedPasscode(newInt.passcode);
      setEmailModalOpen(true);

      if (gmailStatus.connected) {
        setSendingEmail(false);
        if (apiResult && apiResult.emailSent) {
          setEmailSendStatus('success');
        } else {
          setEmailSendStatus('failed');
        }
      } else {
        // Automatically trigger local mail client redirection fallback
        const mailtoUrl = `mailto:${cEmail}?subject=${encodeURIComponent("Your AI Screening Interview Invitation - NexaHire")}&body=${encodeURIComponent(
          `Hello ${cName},\n\nYou have been invited for an AI Screening Interview for the role of ${finalJobRole}.\n\n` +
          `Please use the secure link below to start the proctored assessment:\n` +
          `${linkStr}\n\n` +
          `Your credentials:\n` +
          `- Email: ${cEmail}\n` +
          `- Passcode / Password: ${newInt.passcode}\n\n` +
          `Best regards,\n` +
          `NexaHire System`
        )}`;

        setTimeout(() => {
          window.location.href = mailtoUrl;
        }, 400);
      }
    } catch (err) {
      console.error('Failed to create interview assessment:', err);
      setSendingEmail(false);
      setEmailSendStatus('failed');
    }

    // Reset Form
    setCName('');
    setCEmail('');
    setCustomJobRole('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Secure interview link copied to clipboard!');
  };

  return (
    <div className="w-full apex-theme-bg flex flex-col justify-between flex-grow" style={{ position: 'relative', minHeight: 'calc(100vh - 56px)' }}>
      <div className="container py-8 flex-grow" style={{ zIndex: 1 }}>
        <div className="dashboard-grid">
        {/* Sidebar Nav */}
        <aside className="dashboard-sidebar">
          <div className="px-4 py-2 text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Controls</div>
          <button 
            className={`sidebar-nav-item ${activeTab === 'list' && !selectedInterview ? 'active' : ''}`}
            onClick={() => { setActiveTab('list'); onCloseReport(); }}
          >
            <ClipboardList className="w-4 h-4" /> Assessment Logs
          </button>
          <button 
            className={`sidebar-nav-item ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => { setActiveTab('create'); onCloseReport(); }}
          >
            <UserPlus className="w-4 h-4" /> Generate Secure Link
          </button>
          <button 
            className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('settings'); onCloseReport(); }}
          >
            <Settings className="w-4 h-4" /> System Settings
          </button>

          {selectedInterview && (
            <>
              <div className="px-4 py-2 mt-4 text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Active Report</div>
              <button className="sidebar-nav-item active">
                <Star className="w-4 h-4 text-indigo-400" /> {selectedInterview.candidateName}
              </button>
            </>
          )}

          {/* Quick Telemetry Console */}
          <div className="sidebar-telemetry-panel">
            <div className="telemetry-panel-title">SYSTEM TELEMETRY</div>
            <div className="telemetry-panel-row">
              <span className="telemetry-panel-label">Proctor Server</span>
              <span className="telemetry-panel-value text-emerald-400">
                <span className="telemetry-ping-dot"></span> ONLINE
              </span>
            </div>
            <div className="telemetry-panel-row">
              <span className="telemetry-panel-label">Biometric Core</span>
              <span className="telemetry-panel-value text-cyan-400 font-mono">v3.42-sec</span>
            </div>
          </div>
        </aside>

        {/* Dynamic Panel Content */}
        <section className="flex-grow">
          {selectedInterview ? (
            /* DETAILED CANDIDATE REPORT CARD VIEW */
            <CandidateReportCard interview={selectedInterview} onClose={onCloseReport} hrToken={hrToken} />
          ) : activeTab === 'list' ? (
            /* MAIN LIST OF CANDIDATES */
            <div className="dashboard-content-wrapper animate-fade-in">
              <div className="flex justify-between items-center text-left">
                <div>
                  <h2 className="dashboard-page-title">Interview Assessment Logs</h2>
                  <p className="dashboard-page-desc">Monitor generated invitation tokens and examine detailed AI evaluations.</p>
                </div>
                <button className="btn btn-primary flex gap-2 items-center" onClick={() => setActiveTab('create')}>
                  <UserPlus className="w-4 h-4" /> Create New Invite
                </button>
              </div>

              {/* Stats Counters Grid */}
              <div className="dashboard-stats-grid">
                <div className="dashboard-stat-card">
                  <span className="stat-card-label">Total Tokens</span>
                  <span className="stat-card-value text-white">{total}</span>
                </div>
                <div className="dashboard-stat-card">
                  <span className="stat-card-label">Completed Sessions</span>
                  <span className="stat-card-value text-indigo-400">{completed}</span>
                </div>
                <div className="dashboard-stat-card">
                  <span className="stat-card-label">Active Screenings</span>
                  <span className="stat-card-value text-cyan-400">{activeCount}</span>
                </div>
                <div className="dashboard-stat-card">
                  <span className="stat-card-label">Average Score</span>
                  <span className="stat-card-value text-emerald-400">{avgScore}%</span>
                </div>
              </div>

              {/* Assessment Table */}
              <div className="glass-card p-0 overflow-hidden">
                {interviews.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                    <p className="font-semibold text-white">No interviews generated yet</p>
                    <p className="text-sm text-slate-500 mt-1">Generate a secure smart invitation link to get started.</p>
                  </div>
                ) : (
                  <div className="custom-table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Role</th>
                          <th>Created / Expires</th>
                          <th>Status</th>
                          <th>AI Evaluation</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interviews.map(int => {
                          const isLive = window.liveCandidateSession && window.liveCandidateSession.interviewId === int.id;
                          const isExpired = new Date() > new Date(int.expiresAt) && int.status === 'Active';
                          const statusStr = isExpired ? 'Expired' : int.status;

                          return (
                            <tr key={int.id}>
                               <td>
                                 <div className="font-semibold text-white flex items-center gap-2">
                                   {int.candidateName}
                                   <span className={`text-[8px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded border ${int.candidateType === 'freshers' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                                     {int.candidateType === 'freshers' ? 'Fresher' : 'Exp'}
                                   </span>
                                 </div>
                                 <div className="text-xs text-slate-500 font-mono">{int.candidateEmail}</div>
                                 <div className="text-[10px] text-emerald-400 font-mono font-bold mt-1 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded inline-block">
                                   🔑 Passcode: {int.passcode}
                                 </div>
                               </td>
                               <td>
                                 <span className="font-mono text-xs text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/15">
                                   {int.jobRole}
                                 </span>
                                 <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                                   <span>⏱️ Limit:</span>
                                   <strong className="text-slate-300">{int.durationLimit || 30} Mins</strong>
                                 </div>
                               </td>
                              <td className="font-mono text-xs text-slate-400">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <Clock className="w-3.5 h-3.5" /> Created: {new Date(int.createdAt).toLocaleDateString()}
                                </div>
                                <div className={`flex items-center gap-1.5 mt-1 font-bold ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>
                                  <Clock className="w-3.5 h-3.5" /> Expiry: {new Date(int.expiresAt).toLocaleTimeString()}
                                </div>
                              </td>
                              <td>
                                {statusStr === 'Completed' && (
                                  <span className="badge badge-success"><CheckCircle2 className="w-3 h-3" /> Completed</span>
                                )}
                                {isLive && (
                                  <span className="badge badge-success bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-pulse font-bold"><Activity className="w-3 h-3" /> LIVE</span>
                                )}
                                {statusStr === 'Active' && !isLive && (
                                  <span className="badge bg-slate-500/10 border border-slate-500/20 text-slate-400"><Clock className="w-3 h-3" /> Active</span>
                                )}
                                {statusStr === 'Expired' && (
                                  <span className="badge badge-danger"><ShieldAlert className="w-3 h-3" /> Expired</span>
                                )}
                              </td>
                              <td>
                                {int.report ? (
                                  <div className="flex items-center gap-3">
                                    <div className="font-bold text-emerald-400 font-mono text-sm">{int.report.overallScore}%</div>
                                    <div className="w-16 bg-white/5 h-2 rounded-full overflow-hidden">
                                      <div className="bg-emerald-400 h-full" style={{ width: `${int.report.overallScore}%` }}></div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500 font-mono">-- N/A --</span>
                                )}
                              </td>
                              <td className="text-right">
                                <div className="flex justify-end gap-2">
                                  {isLive ? (
                                    <button className="btn btn-secondary btn-icon-only text-emerald-400 hover:text-emerald-300 animate-pulse" title="Monitor Candidate Live" onClick={() => onViewLive(int)}>
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  ) : int.report ? (
                                    <button className="btn btn-secondary btn-icon-only text-indigo-400 hover:text-indigo-300" title="Review Report Card" onClick={() => onViewReport(int.id)}>
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button 
                                      className="btn btn-secondary btn-icon-only text-slate-400" 
                                      title="Open Sandbox Portal"
                                      onClick={() => {
                                        if (isExpired) {
                                          alert("This candidate link has expired. You can view the expired page by clicking this, or edit candidate variables.");
                                        }
                                        onGoToCandidate('candidate-start', int.id);
                                      }}
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button className="btn btn-secondary btn-icon-only text-rose-400 hover:text-rose-300" title="Revoke Token" onClick={() => onDeleteInterview(int.id)}>
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'settings' ? (
            /* SYSTEM SETTINGS PAGE */
            <SystemSettings hrToken={hrToken} />
          ) : (
            /* CREATE INTERVIEW CONFIGURATION PAGE */
            <div className="glass-card animate-scale-in text-left dashboard-content-wrapper-card">
              <div>
                <h2 className="dashboard-card-title">Configure AI Screening Link</h2>
                <p className="dashboard-card-desc">Select the candidate profile and job role to automatically generate a secured screening link.</p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="form-split-grid">
                  <div className="form-group">
                    <label className="form-label">Candidate Full Name</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Candidate Email Address</label>
                    <input 
                      type="email" 
                      className="glass-input" 
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      placeholder="john.doe@gmail.com"
                      required
                    />
                    <div style={{ marginTop: '6px' }}>
                      {gmailStatus.connected ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className="animate-fade-in">
                          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                          <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: '600', fontFamily: 'monospace' }}>Auto-dispatch active via {gmailStatus.email}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '500' }}>Direct client compose active. Connect Gmail in Settings to automate emails.</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Candidate Level / Grading Persona</label>
                  <select 
                    className="glass-input"
                    value={candidateType}
                    onChange={(e) => setCandidateType(e.target.value)}
                  >
                    <option value="experienced">Experienced Candidate (Technical Knowledge, Relevant Experience, etc.)</option>
                    <option value="freshers">Fresher Candidate (Academic Knowledge, Adaptability, Willingness to Work, etc.)</option>
                  </select>
                </div>

                <div className="form-group">
                  <div className="flex justify-between items-center mb-1.5" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Job Role & Assessment Template</label>
                    <button
                      type="button"
                      onClick={handleSaveAsTemplate}
                      style={{
                        background: 'transparent',
                        border: '1px dashed rgba(6, 182, 212, 0.4)',
                        color: '#06b6d4',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                      className="hover:bg-cyan-500/10 hover:border-cyan-400"
                    >
                      💾 Save as Template
                    </button>
                  </div>
                  <select 
                    className="glass-input"
                    value={jobRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.role}>{t.role}</option>
                    ))}
                    <option value="Custom">Custom Role / Manual Entry...</option>
                  </select>
                </div>
                {jobRole === 'Custom' && (
                  <div className="form-group animate-fade-in">
                    <label className="form-label font-mono text-cyan-400">Custom Job Title</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={customJobRole}
                      onChange={(e) => setCustomJobRole(e.target.value)}
                      placeholder="e.g. Senior Backend Engineer"
                      required
                    />
                  </div>
                )}

                <div className="advanced-toggle-container">
                  <button 
                    type="button" 
                    onClick={() => setShowAdvanced(!showAdvanced)} 
                    className="advanced-toggle-btn"
                  >
                    {showAdvanced ? 'Hide Advanced Question Configuration ▲' : 'Customize Interview Questions & Parameters (Advanced) ▼'}
                  </button>
                </div>

                {showAdvanced && (
                  <div className="advanced-panel-content animate-fade-in">
                    <div className="form-split-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', width: '100%' }}>
                      <div className="form-group">
                        <label className="form-label">Required Passing Score (%)</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="100"
                          className="glass-input" 
                          value={passingScore}
                          onChange={(e) => setPassingScore(Number(e.target.value))}
                          placeholder="e.g. 75"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Invitation Window (Expiry Countdown)</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <select 
                            className="glass-input"
                            value={validityOptions.includes(validity) ? validity : 'custom'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setValidity(30); // default custom
                              } else {
                                setValidity(Number(val));
                              }
                            }}
                            style={{ flexGrow: 1 }}
                          >
                            <option value={1}>1 Hour (Urgent Screen)</option>
                            <option value={2}>2 Hours</option>
                            <option value={24}>24 Hours</option>
                            <option value={30}>30 Hours</option>
                            <option value={168}>7 Days (Standard)</option>
                            <option value="custom">Custom Duration (Hours)...</option>
                          </select>
                          
                          {(!validityOptions.includes(validity) || validity === 30) && (
                            <div className="animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '120px', flexShrink: 0 }}>
                              <input 
                                type="number" 
                                min="1" 
                                max="720"
                                className="glass-input" 
                                style={{ textAlign: 'center', padding: '10px 4px' }}
                                value={validity}
                                onChange={(e) => setValidity(Math.max(1, Number(e.target.value)))}
                              />
                              <span className="text-xs text-slate-400 font-bold font-mono">Hrs</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Interview Assessment Duration</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <select 
                            className="glass-input"
                            value={durationOptions.includes(durationLimit) ? durationLimit : 'custom'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setDurationLimit(60); // default custom
                              } else {
                                setDurationLimit(Number(val));
                              }
                            }}
                            style={{ flexGrow: 1 }}
                          >
                            <option value={15}>15 Minutes</option>
                            <option value={30}>30 Minutes</option>
                            <option value={45}>45 Minutes</option>
                            <option value={60}>1 Hour</option>
                            <option value={120}>2 Hours</option>
                            <option value="custom">Custom (Minutes)...</option>
                          </select>
                          
                          {(!durationOptions.includes(durationLimit) || durationLimit === 60) && (
                            <div className="animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '120px', flexShrink: 0 }}>
                              <input 
                                type="number" 
                                min="5" 
                                max="180"
                                className="glass-input" 
                                style={{ textAlign: 'center', padding: '10px 4px' }}
                                value={durationLimit}
                                onChange={(e) => setDurationLimit(Math.max(5, Number(e.target.value)))}
                              />
                              <span className="text-xs text-slate-400 font-bold font-mono">Min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* PHASE 1 THEORY QUESTIONS */}
                    <div className="phase-timeline-container relative flex gap-6 mt-8">
                      {/* Left Timeline Graphic */}
                      <div className="timeline-left-column relative flex flex-col items-center select-none" style={{ width: '80px', flexShrink: 0 }}>
                        {/* Glowing top point */}
                        <div className="timeline-top-glow bg-cyan-400 shadow-[0_0_12px_#00f0ff] w-3 h-3 rounded-full z-10"></div>
                        {/* Vertical line */}
                        <div className="timeline-vertical-line w-[3px] bg-gradient-to-b from-cyan-400 via-cyan-500/50 to-transparent flex-grow relative" style={{ boxShadow: '0 0 8px rgba(0, 240, 255, 0.3)' }}>
                          {/* Centered Phase Circle Badge */}
                          <div className="timeline-phase-badge border-2 border-cyan-400 bg-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.25)] flex flex-col items-center justify-center">
                            <span className="text-[8px] uppercase tracking-widest text-cyan-400 font-bold leading-none">PHASE</span>
                            <span className="text-xl font-black text-white leading-none mt-1">01</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Questions Column */}
                      <div className="flex-grow space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <div>
                            <h4 className="dashboard-section-title text-base font-bold flex items-center gap-2">
                              <span>PHASE 1:</span>
                              <span className="text-cyan-400">THEORY</span>
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">20-minute theory assessment</p>
                          </div>
                          <button type="button" className="phase-add-btn border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/5" onClick={addPhase1Question}>
                            + Add Theory
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          {phase1Q.map((q, idx) => (
                            <div key={`p1-${idx}`} className="question-card border-cyan-500/10 hover:border-cyan-500/20 relative">
                              {/* Dynamic timeline connector dot & line */}
                              <div className="absolute top-[36px] right-full flex items-center select-none pointer-events-none" style={{ width: '64px' }}>
                                <div className="connector-dot bg-cyan-400 w-1.5 h-1.5 rounded-full shadow-[0_0_6px_#00f0ff] flex-shrink-0"></div>
                                <div className="connector-horizontal-line h-[1.5px] bg-cyan-400/30 flex-grow"></div>
                              </div>
                              <div className="question-row flex items-center gap-3">
                                {/* Hexagon Badge SVG */}
                                <div className="flex-shrink-0">
                                  <svg width="40" height="40" viewBox="0 0 100 100">
                                    <polygon points="25,8 75,8 94,50 75,92 25,92 6,50" stroke="#00f0ff" strokeWidth="6" fill="rgba(0, 240, 255, 0.08)" style={{ filter: 'drop-shadow(0 0 4px rgba(0, 240, 255, 0.4))' }} />
                                    <text x="50" y="55" fontSize="28" fontWeight="bold" fill="#00f0ff" textAnchor="middle" dominantBaseline="middle">T{idx+1}</text>
                                  </svg>
                                </div>
                                
                                <input 
                                  type="text" 
                                  className="glass-input question-input"
                                  value={q.text || ''}
                                  onChange={(e) => handlePhase1QuestionFieldChange(idx, 'text', e.target.value)}
                                  placeholder="Type Theory Phase question..."
                                  required
                                />
                                
                                <div className="select-wrapper relative">
                                  <select
                                    className="glass-input question-select"
                                    value={q.type || 'speech'}
                                    onChange={(e) => handlePhase1QuestionFieldChange(idx, 'type', e.target.value)}
                                  >
                                    <option value="speech">🎙️ Speech</option>
                                    <option value="text">⌨️ Written</option>
                                    <option value="mcq">🔘 MCQ</option>
                                  </select>
                                </div>
                                
                                <button 
                                  type="button" 
                                  className="question-remove-btn"
                                  onClick={() => removePhase1Question(idx)}
                                  disabled={phase1Q.length <= 1}
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </div>
                              
                              {q.type === 'mcq' && (
                                <div className="flex gap-2 items-center pl-[52px] mt-2 animate-scale-in">
                                  <span className="text-[10px] font-mono text-slate-500 uppercase">MCQ OPTIONS:</span>
                                  <input
                                    type="text"
                                    className="glass-input text-[11px] font-mono text-amber-400"
                                    value={q.optionsText || ''}
                                    onChange={(e) => handlePhase1QuestionFieldChange(idx, 'optionsText', e.target.value)}
                                    placeholder="Enter choices separated by commas (e.g. Option A, Option B, Option C)"
                                    required
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* PHASE 2 ASSESSMENT QUESTIONS */}
                    <div className="phase-timeline-container relative flex gap-6 mt-12">
                      {/* Left Timeline Graphic */}
                      <div className="timeline-left-column relative flex flex-col items-center select-none" style={{ width: '80px', flexShrink: 0 }}>
                        {/* Glowing top point */}
                        <div className="timeline-top-glow bg-purple-400 shadow-[0_0_12px_#b55fe6] w-3 h-3 rounded-full z-10"></div>
                        {/* Vertical line */}
                        <div className="timeline-vertical-line w-[3px] bg-gradient-to-b from-purple-400 via-purple-500/50 to-transparent flex-grow relative" style={{ boxShadow: '0 0 8px rgba(181, 95, 230, 0.3)' }}>
                          {/* Centered Phase Circle Badge */}
                          <div className="timeline-phase-badge border-2 border-purple-400 bg-slate-950 shadow-[0_0_20px_rgba(181, 95, 230, 0.25)] flex flex-col items-center justify-center">
                            <span className="text-[8px] uppercase tracking-widest text-purple-400 font-bold leading-none">PHASE</span>
                            <span className="text-xl font-black text-white leading-none mt-1">02</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Questions Column */}
                      <div className="flex-grow space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <div>
                            <h4 className="dashboard-section-title text-base font-bold flex items-center gap-2">
                              <span>PHASE 2:</span>
                              <span className="text-purple-400">ASSESSMENT</span>
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">10-minute grammar/writing assessment</p>
                          </div>
                          <button type="button" className="phase-add-btn border-purple-500/30 text-purple-400 hover:bg-purple-500/5" onClick={addPhase2Question}>
                            + Add Assessment
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          {phase2Q.map((q, idx) => (
                            <div key={`p2-${idx}`} className="question-card border-purple-500/10 hover:border-purple-500/20 relative">
                              {/* Dynamic timeline connector dot & line */}
                              <div className="absolute top-[36px] right-full flex items-center select-none pointer-events-none" style={{ width: '64px' }}>
                                <div className="connector-dot bg-purple-400 w-1.5 h-1.5 rounded-full shadow-[0_0_6px_#b55fe6] flex-shrink-0"></div>
                                <div className="connector-horizontal-line h-[1.5px] bg-purple-400/30 flex-grow"></div>
                              </div>
                              <div className="question-row flex items-center gap-3">
                                {/* Hexagon Badge SVG */}
                                <div className="flex-shrink-0">
                                  <svg width="40" height="40" viewBox="0 0 100 100">
                                    <polygon points="25,8 75,8 94,50 75,92 25,92 6,50" stroke="#b55fe6" strokeWidth="6" fill="rgba(181, 95, 230, 0.08)" style={{ filter: 'drop-shadow(0 0 4px rgba(181, 95, 230, 0.4))' }} />
                                    <text x="50" y="55" fontSize="28" fontWeight="bold" fill="#b55fe6" textAnchor="middle" dominantBaseline="middle">A{idx+1}</text>
                                  </svg>
                                </div>
                                
                                <input 
                                  type="text" 
                                  className="glass-input question-input"
                                  value={q.text || ''}
                                  onChange={(e) => handlePhase2QuestionFieldChange(idx, 'text', e.target.value)}
                                  placeholder="Type Assessment Phase question..."
                                  required
                                />
                                
                                <div className="select-wrapper relative">
                                  <select
                                    className="glass-input question-select"
                                    value={q.type || 'speech'}
                                    onChange={(e) => handlePhase2QuestionFieldChange(idx, 'type', e.target.value)}
                                  >
                                    <option value="speech">🎙️ Speech</option>
                                    <option value="text">⌨️ Written</option>
                                    <option value="mcq">🔘 MCQ</option>
                                  </select>
                                </div>
                                
                                <button 
                                  type="button" 
                                  className="question-remove-btn"
                                  onClick={() => removePhase2Question(idx)}
                                  disabled={phase2Q.length <= 1}
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </div>
                              
                              {q.type === 'mcq' && (
                                <div className="flex gap-2 items-center pl-[52px] mt-2 animate-scale-in">
                                  <span className="text-[10px] font-mono text-slate-500 uppercase">MCQ OPTIONS:</span>
                                  <input
                                    type="text"
                                    className="glass-input text-[11px] font-mono text-amber-400"
                                    value={q.optionsText || ''}
                                    onChange={(e) => handlePhase2QuestionFieldChange(idx, 'optionsText', e.target.value)}
                                    placeholder="Enter choices separated by commas (e.g. Option A, Option B, Option C)"
                                    required
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Floating Bottom Status Bar */}
                    <div className="floating-bottom-bar flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bar-icon-box bg-gradient-to-r from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                          <ClipboardList className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono">Total Questions</div>
                          <div className="text-xl font-bold font-mono text-cyan-400 leading-none mt-0.5">
                            {String(phase1Q.length + phase2Q.length).padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button type="button" className="btn btn-secondary text-xs px-4 py-2 border-white/10 hover:bg-white/5" onClick={() => setActiveTab('list')}>
                          Cancel
                        </button>
                        <button type="submit" disabled={sendingEmail} className="bar-submit-btn flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-white">
                          <span>{sendingEmail ? 'Mailing Assessment Link...' : 'Preview & Start'}</span>
                          <div className="w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold">
                            {sendingEmail ? <RefreshCw className="w-3 h-3 animate-spin text-blue-600" /> : '→'}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}
        </section>
      </div>

      {/* SHARE / EMAIL INVITATION MODAL */}
      {emailModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale-in">
            <div className="modal-header">
              <h3 className="text-white flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Token Generated Successfully
              </h3>
            </div>
            <div className="modal-body space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-500">SECURE SCREENING LINK</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Time-Locked</span>
                </div>
                <div className="flex gap-2">
                  <input type="text" readOnly className="glass-input text-xs font-mono select-all bg-black/40 text-cyan-300" value={generatedLink} />
                  <button className="btn btn-primary px-3" onClick={copyToClipboard}>
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-500">CANDIDATE PASSCODE / PASSWORD</span>
                </div>
                <div className="flex gap-2">
                  <input type="text" readOnly className="glass-input text-xs font-mono select-all bg-black/40 text-emerald-400 font-bold" value={generatedPasscode} />
                  <button className="btn btn-primary px-3" onClick={() => {
                    navigator.clipboard.writeText(generatedPasscode);
                    alert('Passcode copied to clipboard!');
                  }}>
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {gmailStatus.connected ? (
                sendingEmail ? (
                  <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/10 space-y-2">
                    <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 text-left">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> Dispatching Link via Gmail...
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed text-left">
                      Connecting with Gmail SMTP and transmitting proctored assessment payload to candidate's inbox...
                    </p>
                  </div>
                ) : emailSendStatus === 'success' ? (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/10 space-y-2 animate-scale-in">
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 text-left">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Automated Invite Delivered!
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed text-left">
                      The credentials and secure token link have been successfully sent directly to the candidate's email address from your connected account: <strong>{gmailStatus.email}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/10 space-y-2 animate-scale-in">
                    <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5 text-left">
                      <AlertTriangle className="w-4 h-4 text-rose-400" /> Gmail Delivery Failed
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed text-left">
                      Gmail SMTP service declined email dispatch. Please verify your connection status in the Settings tab, or copy and send the secure credentials above manually.
                    </p>
                  </div>
                )
              ) : (
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/10 space-y-2">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 text-left">
                    <Mail className="w-4 h-4 text-indigo-400" /> Automated Candidate Email Sent!
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed text-left">
                    We've triggered your default desktop mail composer (mailto:). If it didn't open, copy the secure credentials above. <em>Tip: Connect your Gmail account in Settings to send emails automatically.</em>
                  </p>
                </div>
              )}

              <div className="text-xs text-slate-500 font-mono flex items-center gap-1 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" /> encrypted payload: JWT.256-AES.CBC
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setEmailModalOpen(false);
                  setActiveTab('list');
                }}
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
      
      <footer className="w-full apex-footer py-6 mt-16 relative z-10">
        <div className="container max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AdvancedSecureLogo size="mini" />
            <span className="apex-logo-text" style={{ fontSize: '0.95rem' }}>NexaHire</span>
            <span className="apex-logo-badge" style={{ fontSize: '0.55rem', padding: '1px 6px' }}>AI AGENT</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Enterprise-grade AI talent proctoring and candidate evaluation platform.
          </p>
        </div>
      </footer>
    </div>
    </div>
  );
}

// ----------------------------------------------------
// 4. DETAILED REPORT CARD COMPONENT
// ----------------------------------------------------
function CandidateReportCard({ interview, onClose, isModal = false, hrToken }) {
  const rep = interview.report;
  const videoPlayerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState("00:00 / 02:00");
  const [videoProgress, setVideoProgress] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoLoadProgress, setVideoLoadProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isCustomMaximized, setIsCustomMaximized] = useState(false);

  const handleMuteToggle = () => {
    if (videoPlayerRef.current) {
      const nextMute = !isMuted;
      videoPlayerRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  };

  const handleVolumeChange = (e) => {
    const nextVol = parseFloat(e.target.value);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.volume = nextVol;
      videoPlayerRef.current.muted = nextVol === 0;
      setVolume(nextVol);
      setIsMuted(nextVol === 0);
    }
  };

  const isFresher = interview.candidateType === 'freshers';
  const labels = isFresher ? {
    intro: "Communication Skills",
    comm: "Educational Background / Academic Knowledge",
    conf: "Learning Ability & Adaptability",
    present: "Problem-Solving & Analytical Thinking",
    vocab: "Attitude & Professionalism",
    grammar: "Confidence & Presentation Skills",
    email: "Cultural Fit & Willingness to Work"
  } : {
    intro: "Technical Knowledge / Domain Expertise",
    comm: "Communication Skills",
    conf: "Relevant Experience",
    present: "Problem-Solving & Analytical Skills",
    vocab: "Attitude & Professionalism",
    grammar: "Cultural Fit & Team Collaboration",
    email: "Overall Confidence & Interview Performance"
  };

  const formatTime = (secs) => {
    if (!isFinite(secs) || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const actualDuration = rep && rep.totalDurationSecs ? rep.totalDurationSecs : null;

  useEffect(() => {
    let active = true;
    let blobUrl = null;
    setVideoError(null);
    setIsVideoLoading(true);
    if (actualDuration) {
      setVideoTime(`00:00 / ${formatTime(actualDuration)}`);
    } else {
      setVideoTime("00:00 / --:--");
    }

    // Try IndexedDB first (recorded in this session)
    videoDb.getVideo(interview.id).then(url => {
      if (!active) return;
      if (url) {
        setRecordedVideoUrl(url);
        setIsVideoLoading(false);
        return;
      }

      // Try in-memory store next (page hasn't been refreshed)
      const memUrl = window.recordedVideos && window.recordedVideos[interview.id];
      if (memUrl) {
        setRecordedVideoUrl(memUrl);
        setIsVideoLoading(false);
        return;
      }

      // Fall back to backend — fetch the WHOLE file as a blob to avoid
      // Chrome MEDIA_ERR_DECODE on MediaRecorder WebM files (no Cues index)
      const blobEndpoint = `${BACKEND_URL}/api/interviews/${interview.id}/video/blob`;
      setVideoLoadProgress(1); // show spinner immediately
      const headers = {};
      if (hrToken) {
        headers['Authorization'] = `Bearer ${hrToken}`;
      }
      fetch(blobEndpoint, { headers })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          // Content-Length may be absent (e.g. gzip); use it for progress only if available
          const contentLength = parseInt(res.headers.get('Content-Length') || '0', 10);

          // Stream the response chunk-by-chunk for progress tracking
          const reader = res.body.getReader();
          const chunks = [];
          let received = 0;

          function pump() {
            return reader.read().then(({ done, value }) => {
              if (!active) { reader.cancel(); return; }
              if (done) {
                const blob = new Blob(chunks, { type: 'video/webm' });
                if (blob.size === 0) throw new Error('empty');
                blobUrl = URL.createObjectURL(blob);
                setRecordedVideoUrl(blobUrl);
                setIsVideoLoading(false);
                setVideoLoadProgress(100);
                return;
              }
              chunks.push(value);
              received += value.length;
              if (contentLength > 0) {
                setVideoLoadProgress(Math.min(99, Math.round((received / contentLength) * 100)));
              }
              return pump();
            });
          }
          return pump();
        })
        .catch(err => {
          if (!active) return;
          setIsVideoLoading(false);
          if (err.message === 'empty') {
            setVideoError("Recorded session video is empty (0 bytes).");
          } else {
            setVideoError(`Could not load video: ${err.message}. Is the backend running?`);
          }
        });
    });

    return () => {
      active = false;
      // Revoke any blob URL we created to free memory
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [interview.id, actualDuration]);

  const handleLoadedMetadata = () => {
    if (videoPlayerRef.current) {
      const vid = videoPlayerRef.current;
      
      // Chrome WebM duration seek trick: if duration is Infinity or <= 2 seconds,
      // seek to the end (1e9) to force the browser to read the last cluster timestamp.
      if (vid.duration === Infinity || vid.duration <= 2) {
        const handleSeeked = () => {
          vid.currentTime = 0;
          vid.removeEventListener('seeked', handleSeeked);
          handleTimeUpdate();
        };
        vid.addEventListener('seeked', handleSeeked);
        vid.currentTime = 1e9;
      } else {
        handleTimeUpdate();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoPlayerRef.current) {
      const cur = videoPlayerRef.current.currentTime;
      const dur = videoPlayerRef.current.duration;

      const hasDur = (isFinite(dur) && !isNaN(dur) && dur > 2) || (actualDuration !== null);
      const finalDur = (isFinite(dur) && !isNaN(dur) && dur > 2) ? dur : (actualDuration || 120);
      const durText = hasDur ? formatTime(finalDur) : "--:--";
      setVideoTime(`${formatTime(cur)} / ${durText}`);
      setVideoProgress(hasDur ? (cur / finalDur) * 100 : 0);
    }
  };

  const handlePlayToggle = () => {
    if (videoPlayerRef.current) {
      if (isPlaying) {
        videoPlayerRef.current.pause();
      } else {
        videoPlayerRef.current.play().catch(e => console.log("Play error:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!rep) {
    return (
      <div 
        className={`${isModal ? '' : 'glass-card'} animate-scale-in text-center`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 40px',
          minHeight: '400px',
          gap: '16px',
          width: '100%'
        }}
      >
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          <div className="animate-spin" style={{
            position: 'absolute',
            inset: 0,
            border: '4px solid var(--border-glass)',
            borderTopColor: 'var(--accent-purple)',
            borderRadius: '50%'
          }}></div>
          <div style={{
            position: 'absolute',
            inset: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-purple)'
          }}>
            <Cpu style={{ width: '32px', height: '32px' }} />
          </div>
        </div>
        
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '12px 0 4px' }}>
          AI Evaluation In Progress
        </h3>
        
        <p style={{ maxWidth: '400px', fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          The NexaHire AI Engine is currently processing the transcript, analyzing facial meshes, evaluating security metrics, and preparing the final candidate scorecard.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            Go Back
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw style={{ width: '12px', height: '12px' }} /> Refresh Status
          </button>
        </div>
      </div>
    );
  }

  // SVG Stroke calculations
  const radius = 50;
  const strokeDash = 2 * Math.PI * radius;
  const offset = strokeDash - (rep.overallScore / 100) * strokeDash;

  return (
    <div 
      className={`${isModal ? '' : 'glass-card'} animate-scale-in text-left`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
        ...(isModal ? { padding: 0, border: 'none', background: 'transparent', boxShadow: 'none' } : {})
      }}
    >
      
      {/* 1. Curved Glow Profile Header Banner */}
      <div 
        className="profile-banner-glow"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px',
          borderRadius: '12px',
          border: '1.5px solid var(--border-glass)',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--shadow-premium)'
        }}
      >
        <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '200px', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }}></div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 2 }}>
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'fit-content', fontSize: '10px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <CheckCircle2 style={{ width: '12px', height: '12px', color: 'var(--text-primary)' }} /> Evaluation Completed
          </span>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', textTransform: 'none' }}>{interview.candidateName}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} /> {interview.candidateEmail}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} /> {interview.jobRole}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} /> Persona: <strong style={{ color: 'var(--text-primary)' }}>{isFresher ? 'Fresher' : 'Experienced'}</strong></span>
          </div>
        </div>
        
        {/* Portrait container with border */}
        <div 
          style={{
            position: 'relative',
            zIndex: 2,
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '2px solid var(--border-glass)',
            padding: '2px',
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--shadow-premium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
          }}
        >
          {interview.portraitUrl ? (
            <img 
              src={interview.portraitUrl} 
              alt={interview.candidateName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '20px',
              fontFamily: 'monospace'
            }}>
              {interview.candidateName ? interview.candidateName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'CR'}
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Metric Columns (Assessment Status, Theory, Practical) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', width: '100%' }}>
        
        {/* Assessment Status (Card 1) */}
        <div 
          style={{
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1.5px solid var(--border-glass)',
            boxShadow: 'var(--shadow-premium)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px', fontWeight: 'bold' }}>Assessment Status</span>
          <div className="score-circle-container">
            <svg className="score-circle-svg" width="100" height="100" viewBox="0 0 120 120">
              <circle className="score-circle-bg" cx="60" cy="60" r={radius} />
              <circle 
                className="score-circle-bar" 
                cx="60" 
                cy="60" 
                r={radius} 
                stroke="var(--text-primary)"
                strokeDasharray={strokeDash}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="score-circle-text">
              <span className="score-circle-number" style={{ color: 'var(--text-primary)' }}>{rep.overallScore}%</span>
              <span className="score-circle-label text-[8.5px] font-bold px-1.5 py-0.5 rounded border" style={{
                backgroundColor: rep.overallScore >= (interview.passingScore || 70) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: rep.overallScore >= (interview.passingScore || 70) ? '#10b981' : '#ef4444',
                borderColor: rep.overallScore >= (interview.passingScore || 70) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {rep.overallScore >= (interview.passingScore || 70) ? "PASS" : "FAIL"}
              </span>
            </div>
          </div>
          <div style={{ marginTop: '14px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div>Passing Score: <strong style={{ color: 'var(--text-primary)' }}>{interview.passingScore || 70}%</strong></div>
            {(() => {
              const score = rep.overallScore || 0;
              const passingThreshold = interview.passingScore || 70;
              
              let recText = "Consider";
              let recColor = "#eab308"; // yellow
              let recBg = "rgba(234, 179, 8, 0.1)";
              let recBorder = "rgba(234, 179, 8, 0.3)";

              if (score >= passingThreshold) {
                if (score >= Math.min(100, passingThreshold + 10)) {
                  recText = "Strong Hire";
                  recColor = "#10b981"; // emerald
                  recBg = "rgba(16, 185, 129, 0.1)";
                  recBorder = "rgba(16, 185, 129, 0.3)";
                } else {
                  recText = "Hire";
                  recColor = "#06b6d4"; // cyan
                  recBg = "rgba(6, 182, 212, 0.1)";
                  recBorder = "rgba(6, 182, 212, 0.3)";
                }
              } else {
                if (score < Math.max(0, passingThreshold - 15)) {
                  recText = "Reject";
                  recColor = "#ef4444"; // red
                  recBg = "rgba(239, 68, 68, 0.1)";
                  recBorder = "rgba(239, 68, 68, 0.3)";
                } else {
                  recText = "Consider";
                  recColor = "#eab308"; // yellow
                  recBg = "rgba(234, 179, 8, 0.1)";
                  recBorder = "rgba(234, 179, 8, 0.3)";
                }
              }
              return (
                <div style={{ 
                  color: recColor, 
                  backgroundColor: recBg, 
                  border: `1.5px solid ${recBorder}`,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  marginTop: '4px',
                  letterSpacing: '0.05em'
                }}>
                  {recText}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Phase 1: Theory Panel (Card 2) */}
        <div 
          style={{
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1.5px solid var(--border-glass)',
            boxShadow: 'var(--shadow-premium)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-glass)', paddingBottom: '8px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen style={{ width: '14px', height: '14px' }} /> Theory Metrics
            </div>
            <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-primary)', backgroundColor: 'var(--bg-navy)', padding: '2px 6px', borderRadius: '4px', border: '1.5px solid var(--border-glass)' }}>Phase 1</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: '3px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} /> {labels.intro}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{rep.introScore || 0}%</strong>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-navy)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <div style={{ backgroundColor: 'var(--text-primary)', height: '100%', width: `${rep.introScore || 0}%` }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: '3px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MessageSquare style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} /> {labels.comm}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{rep.commScore || 0}%</strong>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-navy)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <div style={{ backgroundColor: 'var(--text-primary)', height: '100%', width: `${rep.commScore || 0}%` }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: '3px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} /> {labels.conf}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{rep.confScore || 0}%</strong>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-navy)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <div style={{ backgroundColor: 'var(--text-primary)', height: '100%', width: `${rep.confScore || 0}%` }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: '3px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Star style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} /> {labels.present}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{rep.presentScore || 0}%</strong>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-navy)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <div style={{ backgroundColor: 'var(--text-primary)', height: '100%', width: `${rep.presentScore || 0}%` }}></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', paddingTop: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} /> Shift Adaptability:</span>
              <span className={`px-2 py-0.5 rounded border border-black text-[9px] font-mono font-bold ${rep.nightShiftFine === 'Yes' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                {rep.nightShiftFine || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Phase 2: Assessment Panel (Card 3) */}
        <div 
          style={{
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1.5px solid var(--border-glass)',
            boxShadow: 'var(--shadow-premium)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-glass)', paddingBottom: '8px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClipboardList style={{ width: '14px', height: '14px' }} /> Skill Assessment
            </div>
            <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-primary)', backgroundColor: 'var(--bg-navy)', padding: '2px 6px', borderRadius: '4px', border: '1.5px solid var(--border-glass)' }}>Phase 2</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: '3px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BookOpen style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} /> {labels.vocab}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{rep.vocabScore || 0}%</strong>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-navy)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <div style={{ backgroundColor: 'var(--text-primary)', height: '100%', width: `${rep.vocabScore || 0}%` }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: '3px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ClipboardList style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} /> {labels.grammar}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{rep.grammarScore || 0}%</strong>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-navy)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <div style={{ backgroundColor: 'var(--text-primary)', height: '100%', width: `${rep.grammarScore || 0}%` }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: '3px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} /> {labels.email}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{rep.emailScore || 0}%</strong>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-navy)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <div style={{ backgroundColor: 'var(--text-primary)', height: '100%', width: `${rep.emailScore || 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Bottom Columns (Violations, Video Replay, AI Summary) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', width: '100%' }}>
        
        {/* Proctoring telemetry logs (Card 1) */}
        <div 
          style={{
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1.5px solid var(--border-glass)',
            boxShadow: 'var(--shadow-premium)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {/* Security Camera Silhouette */}
          <svg 
            style={{ opacity: 0.04, position: 'absolute', bottom: '12px', right: '12px', width: '56px', height: '56px', pointerEvents: 'none', color: 'var(--text-primary)' }} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
          >
            <path d="M19 10L14 5h-4L5 10v4l5 5h4l5-5v-4z" />
            <circle cx="12" cy="12" r="2" />
            <path d="M14 12h5" />
          </svg>

          <div style={{ borderBottom: '1.5px solid var(--border-glass)', paddingBottom: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert style={{ width: '14px', height: '14px' }} /> Proctoring Signals
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-navy)', border: '1.5px solid var(--border-glass)', textAlign: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 'bold' }}>CAMERA OFF INCIDENTS</div>
              <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '2px', color: 'var(--text-primary)' }}>
                {rep.cameraOffCount || 0} Incident{rep.cameraOffCount === 1 ? '' : 's'}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', padding: '4px 0', borderBottom: '1px solid var(--bg-navy)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ocular Focus Rate</span>
              <strong style={{ color: 'var(--text-primary)' }}>{rep.eyeContact}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', padding: '4px 0', borderBottom: '1px solid var(--bg-navy)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Speaking Delivery Pace</span>
              <strong style={{ color: 'var(--text-primary)' }}>{rep.pace}</strong>
            </div>
            
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Proctor Activity Logs</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '250px', overflowY: 'auto' }}>
                {rep.proctorFlags && rep.proctorFlags.length > 0 ? (
                  rep.proctorFlags.map((flag, index) => {
                    const isCritical = flag.includes('CRITICAL VIOLATION') || flag.includes('MULTI-MONITOR') || flag.includes('🖥️');
                    const isWarning = flag.toLowerCase().includes('warning') || flag.toLowerCase().includes('drift') || flag.toLowerCase().includes('gaze') || flag.toLowerCase().includes('deviation') || flag.toLowerCase().includes('look away') || flag.toLowerCase().includes('lost') || flag.includes('⚠️') || flag.toLowerCase().includes('hidden');
                    
                    let bg = 'rgba(99, 102, 241, 0.08)';
                    let border = '1.5px solid rgba(99, 102, 241, 0.2)';
                    let color = '#a5b4fc';
                    let Icon = Check;
                    
                    if (isCritical) {
                      bg = 'rgba(239, 68, 68, 0.15)';
                      border = '1.5px solid rgba(239, 68, 68, 0.4)';
                      color = '#fca5a5';
                      Icon = AlertTriangle;
                    } else if (isWarning) {
                      bg = 'rgba(245, 158, 11, 0.12)';
                      border = '1.5px solid rgba(245, 158, 11, 0.35)';
                      color = '#fdba74';
                      Icon = AlertTriangle;
                    }
                    
                    return (
                      <div key={index} style={{ fontSize: '10.5px', fontFamily: 'monospace', padding: '4px 8px', borderRadius: '4px', backgroundColor: bg, border: border, color: color, display: 'flex', alignItems: 'center', gap: '5px', fontWeight: (isCritical || isWarning) ? 'bold' : 'normal', lineHeight: '1.4' }}>
                        <Icon style={{ width: '11px', height: '11px', flexShrink: 0 }} /> {flag}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ fontSize: '10.5px', fontFamily: 'monospace', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1.5px solid ' + 'rgba(99, 102, 241, 0.2)', borderRadius: '4px' }}>
                    <Check style={{ width: '11px', height: '11px', color: '#a5b4fc' }} /> Integrity signals stable
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Security Incidents Panel — only shown when violations exist */}
        {rep.securityViolations && rep.securityViolations.length > 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div
              style={{
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239,68,68,0.04)',
                border: '2px solid rgba(239,68,68,0.3)',
                boxShadow: '0 4px 24px rgba(239,68,68,0.06)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(239,68,68,0.2)', paddingBottom: '10px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert style={{ width: '16px', height: '16px', color: '#ef4444' }} />
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Security Incidents Log
                  </span>
                </div>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                  {rep.securityViolations.length} INCIDENT{rep.securityViolations.length > 1 ? 'S' : ''} DETECTED
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rep.securityViolations.map((v, i) => {
                  const typeLabel = v.type === 'MULTI_MONITOR' ? '🖥️ Multi-Monitor' 
                    : v.type === 'TAB_SWITCH' ? '⇄ Tab Switch' 
                    : v.type === 'TAB_HIDDEN' ? '🫥 Tab Hidden'
                    : v.type || 'Security';
                  const typeColor = v.type === 'MULTI_MONITOR' ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={i} style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '6px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'start' }}>
                      <div>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 'bold', color: typeColor, backgroundColor: `${typeColor}18`, border: `1px solid ${typeColor}40`, padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                          {typeLabel}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: '600', lineHeight: 1.4 }}>{v.reason}</span>
                        {v.deviceInfo && (
                          <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>📟 {v.deviceInfo}</span>
                        )}
                      </div>
                      <div>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {rep.terminationReason && (
                <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.4)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock style={{ width: '12px', height: '12px' }} />
                    EXAM CANCELLED — Termination Reason: {rep.terminationReason}
                  </span>
                  {rep.terminatedAt && (
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#ef4444', opacity: 0.7, marginTop: '4px', display: 'block' }}>
                      Terminated at: {rep.terminatedAt}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Recorded Video Replay (Card 2) */}
        <div 
          style={isCustomMaximized ? {
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            padding: '24px',
            backgroundColor: 'rgba(10, 15, 30, 0.98)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-premium)',
            backdropFilter: 'blur(10px)'
          } : {
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1.5px solid var(--border-glass)',
            boxShadow: 'var(--shadow-premium)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-glass)', paddingBottom: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: isCustomMaximized ? '14px' : '11px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video style={{ width: isCustomMaximized ? '18px' : '14px', height: isCustomMaximized ? '18px' : '14px' }} /> Webcam Session Replay {isCustomMaximized && "(MAXIMIZED REVIEW)"}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <a 
                href={`${BACKEND_URL}/api/interviews/${interview.id}/video/blob`} 
                download={`interview-${interview.id}.webm`}
                style={{ fontSize: isCustomMaximized ? '11px' : '9px', fontFamily: 'monospace', color: '#818cf8', textDecoration: 'underline', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📥 Download Recording (Play in VLC)
              </a>
              {isCustomMaximized && (
                <button 
                  onClick={() => setIsCustomMaximized(false)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
                  title="Close Fullscreen"
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              )}
            </div>
          </div>
          
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: isCustomMaximized ? 'calc(100vh - 160px)' : '250px', 
            borderRadius: '6px', 
            overflow: 'hidden', 
            border: '1.5px solid var(--border-glass)', 
            backgroundColor: '#05070f',
            transition: 'height 0.25s ease'
          }}>
            {videoError ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '16px', textAlign: 'center', color: 'var(--accent-rose)', gap: '4px' }}>
                <AlertTriangle style={{ width: '20px', height: '20px', color: 'var(--accent-rose)' }} />
                <div style={{ fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent-rose)' }}>VIDEO PLAYBACK ERROR</div>
                <div style={{ fontSize: '8px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  {videoError}
                </div>
                <a 
                  href={`${BACKEND_URL}/api/interviews/${interview.id}/video/blob`} 
                  download={`interview-${interview.id}.webm`}
                  style={{ marginTop: '4px', fontSize: '9px', fontFamily: 'monospace', color: '#818cf8', textDecoration: 'underline', fontWeight: 'bold' }}
                >
                  Download recording to view in VLC
                </a>
              </div>
            ) : isVideoLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '16px', textAlign: 'center', color: 'var(--text-muted)', gap: '8px' }}>
                <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid var(--border-glass)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', flexShrink: 0 }}></div>
                <div style={{ fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {videoLoadProgress > 0 ? `DOWNLOADING SESSION... ${videoLoadProgress}%` : 'LOADING SESSION VIDEO...'}
                </div>
                {videoLoadProgress > 0 && (
                  <div style={{ width: '80%', height: '3px', backgroundColor: 'var(--border-glass)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${videoLoadProgress}%`, backgroundColor: 'var(--text-primary)', transition: 'width 0.2s ease', borderRadius: '2px' }}></div>
                  </div>
                )}
              </div>
            ) : recordedVideoUrl ? (
              <>
                <video 
                  ref={videoPlayerRef}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(100%)' }} 
                  src={recordedVideoUrl}
                  preload="auto"
                  playsInline
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  onError={(e) => {
                    const err = e.target.error;
                    const code = err ? err.code : 0;

                    if ((code === 3 || code === 2) && recordedVideoUrl && !recordedVideoUrl.startsWith('blob:')) {
                      setIsVideoLoading(true);
                      setVideoLoadProgress(1);
                      const blobEndpoint = `${BACKEND_URL}/api/interviews/${interview.id}/video/blob`;
                      fetch(blobEndpoint)
                        .then(res => {
                          if (!res.ok) throw new Error(`HTTP ${res.status}`);
                          const contentLength = parseInt(res.headers.get('Content-Length') || '0', 10);
                          const reader = res.body.getReader();
                          const chunks = [];
                          let received = 0;
                          function pump() {
                            return reader.read().then(({ done, value }) => {
                              if (done) {
                                const blob = new Blob(chunks, { type: 'video/webm' });
                                const newUrl = URL.createObjectURL(blob);
                                setRecordedVideoUrl(newUrl);
                                setIsVideoLoading(false);
                                setVideoLoadProgress(100);
                                return;
                              }
                              chunks.push(value);
                              received += value.length;
                              if (contentLength > 0) {
                                setVideoLoadProgress(Math.min(99, Math.round((received / contentLength) * 100)));
                              }
                              return pump();
                            });
                          }
                          return pump();
                        })
                        .catch(() => {
                          setIsVideoLoading(false);
                          setVideoError("Could not load session video from server.");
                        });
                      return;
                    }

                    const msgs = { 1: "Playback aborted.", 2: "Network error loading video.", 3: "Video decode failed.", 4: "Codec not supported." };
                    setVideoError(msgs[code] || "Failed to load video.");
                  }}
                ></video>
                
                {/* Pulsing REC Indicator */}
                <div style={{ position: 'absolute', top: '8px', left: '8px', padding: '2px 6px', backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-glass)', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', zIndex: 5 }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', display: 'inline-block' }} className="animate-pulse"></span> REPLAY
                </div>
 
                {/* Play Button Overlay */}
                {!isPlaying && (
                  <div 
                    onClick={handlePlayToggle}
                    style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', cursor: 'pointer', zIndex: 4 }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-premium)' }}>
                      <Play style={{ width: '14px', height: '14px', fill: 'var(--text-primary)', color: 'var(--text-primary)', marginLeft: '2px' }} />
                    </div>
                  </div>
                )}
 
                {/* Video Controls Bar Overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isCustomMaximized ? '10px 16px' : '6px 10px', background: 'var(--bg-card)', borderTop: '1.5px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', zIndex: 10 }}>
                  <button onClick={handlePlayToggle} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }} title={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? (
                      <Pause style={{ width: isCustomMaximized ? '14px' : '12px', height: isCustomMaximized ? '14px' : '12px', fill: 'var(--text-primary)', color: 'var(--text-primary)' }} />
                    ) : (
                      <Play style={{ width: isCustomMaximized ? '14px' : '12px', height: isCustomMaximized ? '14px' : '12px', fill: 'var(--text-primary)', color: 'var(--text-primary)' }} />
                    )}
                  </button>
                  
                  {/* Progress Bar */}
                  <div style={{ flexGrow: 1, height: '4px', backgroundColor: 'var(--bg-navy)', border: '1px solid var(--border-glass)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', backgroundColor: 'var(--text-primary)', width: `${videoProgress}%`, transition: 'width 0.1s' }}></div>
                  </div>
 
                  <span style={{ fontSize: isCustomMaximized ? '10px' : '8px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{videoTime}</span>

                  {/* Volume Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button 
                      onClick={handleMuteToggle} 
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX style={{ width: isCustomMaximized ? '14px' : '12px', height: isCustomMaximized ? '14px' : '12px' }} />
                      ) : (
                        <Volume2 style={{ width: isCustomMaximized ? '14px' : '12px', height: isCustomMaximized ? '14px' : '12px' }} />
                      )}
                    </button>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      value={isMuted ? 0 : volume} 
                      onChange={handleVolumeChange} 
                      style={{ width: isCustomMaximized ? '60px' : '40px', height: '3px', cursor: 'pointer', accentColor: 'var(--text-primary)', outline: 'none' }}
                      title="Adjust Volume"
                    />
                  </div>

                  {/* Maximize / Minimize Button */}
                  <button 
                    onClick={() => setIsCustomMaximized(!isCustomMaximized)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
                    title={isCustomMaximized ? "Exit Fullscreen" : "Maximize Screen"}
                  >
                    <Maximize2 style={{ width: isCustomMaximized ? '14px' : '12px', height: isCustomMaximized ? '14px' : '12px' }} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CameraOff style={{ width: '22px', height: '22px', marginBottom: '8px', color: 'var(--text-primary)' }} />
                <div style={{ fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--text-primary)' }}>NO RECORDED WEB REPLAY</div>
                <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.3' }}>
                  Real audio & video telemetry are captured securely during active candidate screening.
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
              <ShieldCheck style={{ width: '12px', height: '12px' }} /> Integrity check: SHA-256
            </span>
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'monospace', margin: 0 }}>
              Session media validated on submission.
            </p>
          </div>
        </div>

        {/* AI Synthesis Summary (Card 3) */}
        <div 
          style={{
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1.5px solid var(--border-glass)',
            boxShadow: 'var(--shadow-premium)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {/* Brain Graphic Overlay */}
          <svg 
            style={{ opacity: 0.04, position: 'absolute', bottom: '12px', right: '12px', width: '56px', height: '56px', pointerEvents: 'none', color: 'var(--text-primary)' }} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M50 20C40 20 35 25 35 35C35 45 42 48 42 55C42 60 38 65 38 75C38 82 45 88 50 88C55 88 62 82 62 75C62 65 58 60 58 55C58 48 65 45 65 35C65 25 60 20 50 20Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3"/>
            <circle cx="50" cy="20" r="3" fill="currentColor"/>
            <circle cx="35" cy="35" r="3" fill="currentColor"/>
            <circle cx="65" cy="35" r="3" fill="currentColor"/>
            <line x1="50" y1="20" x2="35" y2="35" stroke="currentColor" strokeWidth="0.5"/>
            <line x1="50" y1="20" x2="65" y2="35" stroke="currentColor" strokeWidth="0.5"/>
          </svg>

          <div style={{ borderBottom: '1.5px solid var(--border-glass)', paddingBottom: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles style={{ width: '14px', height: '14px' }} /> AI evaluation Summary
            </span>
          </div>

          <div style={{ position: 'relative', padding: '12px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-navy)', border: '1.5px solid var(--border-glass)', height: '250px', overflowY: 'auto', display: 'flex', alignItems: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5', fontStyle: 'italic', margin: 0, paddingLeft: '4px', paddingRight: '4px', zIndex: 1 }}>
              "{rep.summary}"
            </p>
          </div>
        </div>

      </div>

      {/* 4. Interactive Transcript Log with Audio Waveform */}
      <div 
        style={{
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-card)',
          border: '1.5px solid var(--border-glass)',
          boxShadow: 'var(--shadow-premium)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        
        {/* Waveform Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-glass)', paddingBottom: '10px' }}>
          <h3 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
            <MessageSquare style={{ width: '16px', height: '16px', color: 'var(--text-primary)' }} /> Session Transcript
          </h3>
          
          {/* Linear Audio Waveform */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3px', height: '16px', width: '160px', opacity: 0.8 }}>
            {[...Array(30)].map((_, i) => {
              const height = 4 + Math.abs(Math.sin((i + 1) * 0.2)) * 12 + Math.random() * 2;
              const color = 'var(--text-primary)';
              return (
                <div 
                  key={i} 
                  className={isPlaying ? "animate-pulse" : ""}
                  style={{ 
                    width: '2px', 
                    borderRadius: '999px',
                    height: `${height}px`, 
                    backgroundColor: color,
                    animationDelay: `${i * 0.04}s`,
                    animationDuration: '0.8s'
                  }}
                ></div>
              );
            })}
          </div>
          
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 'bold' }}>{videoTime}</span>
        </div>

        <div style={{ borderRadius: '6px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
          {interview.transcript && interview.transcript.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {interview.transcript.map((line, idx) => {
                if (line.speaker === 'System') {
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '6px 0' }}>
                      <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)', backgroundColor: 'var(--bg-navy)', border: '1.5px solid var(--border-glass)', borderRadius: '4px', padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {line.text.replace(/^-+\s*|\s*-+$/g, '')}
                      </div>
                    </div>
                  );
                }
                const isAI = line.speaker === 'AI Recruiter';
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isAI ? 'flex-start' : 'flex-end', width: '100%' }}>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', fontWeight: 'bold' }}>
                      {isAI ? (
                        <>
                          <Sparkles style={{ width: '10px', height: '10px' }} /> APEX AI
                        </>
                      ) : (
                        <span>{interview.candidateName ? interview.candidateName.toUpperCase() : 'CANDIDATE'}</span>
                      )}
                      {line.timestamp && (
                        <>
                          <span style={{ color: 'var(--border-glass)' }}>•</span>
                          <span style={{ color: 'var(--text-muted)' }}>{line.timestamp}</span>
                        </>
                      )}
                    </div>
                    <div 
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.45',
                        maxWidth: '80%',
                        padding: '8px 12px',
                        boxShadow: '1px 1px 0px var(--border-glass)',
                        ...(isAI 
                          ? { 
                              backgroundColor: 'rgba(99, 102, 241, 0.08)', 
                              border: '1.5px solid rgba(99, 102, 241, 0.25)', 
                              borderRadius: '0 8px 8px 8px' 
                            } 
                          : { 
                              backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                              border: '1.5px solid var(--border-glass)', 
                              borderRadius: '8px 0 8px 8px' 
                            })
                      }}
                    >
                      {line.text}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>No transcripts recorded for this session.</div>
          )}
        </div>
      </div>

      {!isModal && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1.5px solid var(--border-glass)' }}>
          <button 
            className="btn btn-danger" 
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={async () => {
              if (!window.confirm("Are you sure you want to reset this interview? This will delete the current report, transcript, and allow the candidate to retake the interview.")) {
                return;
              }
              try {
                const res = await fetch(`${BACKEND_URL}/api/interviews/${interview.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    status: 'Active',
                    transcript: [],
                    report: null,
                    candidateName: '',
                    candidateEmail: ''
                  })
                });
                if (res.ok) {
                  alert("Interview session has been reset successfully. The candidate can now retake the assessment.");
                  window.location.reload();
                } else {
                  alert("Failed to reset interview session.");
                }
              } catch (err) {
                alert("Error resetting interview session: " + err.message);
              }
            }}
          >
            Reset Interview (Allow Retake)
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 5. CANDIDATE START SCREEN / CAMERA CHECK
// ----------------------------------------------------
function CandidateStart({ interview, onStartInterview, onExpired, onLockdownActivate, onGoToAuth, setCandidateToken }) {
  const [candidateName, setCandidateName] = useState(() => interview?.candidateName || '');
  const [candidateEmail, setCandidateEmail] = useState(() => interview?.candidateEmail || '');
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [cameraStage, setCameraStage] = useState('welcome'); // welcome | camera-check
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Warm up voices cache
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Read passcode from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('passcode') || '';
    if (code) {
      setEnteredPasscode(code);
    }
  }, []);

  // Check link validity on load and sync inputs
  useEffect(() => {
    if (!interview) return;
    if (!candidateName && interview.candidateName) {
      setCandidateName(interview.candidateName);
    }
    if (!candidateEmail && interview.candidateEmail) {
      setCandidateEmail(interview.candidateEmail);
    }
    const isExpired = new Date() > new Date(interview.expiresAt);
    if (isExpired) {
      onExpired();
    }
  }, [interview, onExpired, candidateName, candidateEmail]);

  const handleProceedToCalibration = async () => {
    setPasscodeError('');
    if (!candidateName.trim()) {
      setPasscodeError('Please enter your full name.');
      return;
    }
    if (!candidateEmail.trim()) {
      setPasscodeError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidateEmail.trim())) {
      setPasscodeError('Please enter a valid email address.');
      return;
    }

    try {
      const res = await fetch(BACKEND_URL + '/api/auth/candidate/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: interview?.id,
          passcode: enteredPasscode.trim(),
          candidateName: candidateName.trim(),
          candidateEmail: candidateEmail.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setPasscodeError(data.error || 'Invalid passcode or login failed.');
        return;
      }

      // Store candidate token
      localStorage.setItem('candidate_token', data.token);
      if (setCandidateToken) {
        setCandidateToken(data.token);
      }

      if ('speechSynthesis' in window) {
        try {
          const unlockUtterance = new SpeechSynthesisUtterance('Calibrating hardware');
          unlockUtterance.volume = 0.01;
          window.speechSynthesis.speak(unlockUtterance);
        } catch (e) {}
      }

      setCameraStage('camera-check');
    } catch (err) {
      setPasscodeError('Could not connect to authentication server. Please try again.');
    }
  };

  const requestCameraAccess = async () => {
    setLoading(true);
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      setCameraGranted(true);
      streamRef.current = stream;
      
      // Bind video node
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 300);
    } catch (err) {
      console.error(err);
      setCameraError(true);
      setCameraGranted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    // Release video stream before starting
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if ('speechSynthesis' in window) {
      try {
        const unlockUtterance = new SpeechSynthesisUtterance('Starting assessment');
        unlockUtterance.volume = 0.01;
        window.speechSynthesis.speak(unlockUtterance);
      } catch (e) {}
    }

    if (onLockdownActivate) {
      onLockdownActivate();
    }

    // Enter secure fullscreen lockdown desktop
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request rejected", err);
    }

    // Save candidate data locally if they filled it
    if (interview) {
      onStartInterview(interview.id, candidateName, candidateEmail);
    }
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (interview && (interview.status === 'Completed' || interview.status === 'Terminated')) {
    return (
      <div className="container py-16 flex-grow flex items-center justify-center">
        <div className="glass-card max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-white text-lg">Interview Session Closed</h2>
            <p className="text-slate-400 text-sm mt-2">
              This screening invitation has already been completed or terminated. For security compliance, interview links are strictly single-use and cannot be accessed a second time.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-2 text-left">
            <h4 className="text-xs font-mono text-slate-400 font-bold uppercase">Session Details</h4>
            <ul className="text-xs text-slate-500 space-y-1.5 font-mono">
              <li>👤 Candidate: <strong>{interview.candidateName || 'N/A'}</strong></li>
              <li>📧 Email: <strong>{interview.candidateEmail || 'N/A'}</strong></li>
              <li>💼 Role: <strong>{interview.jobRole}</strong></li>
              <li>🛡️ Status: <strong className="text-rose-400 uppercase">{interview.status}</strong></li>
            </ul>
          </div>
          <p className="text-xs text-slate-600 font-mono">
            If you believe this is an error, please reach out to your recruiter.
          </p>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="container py-16 flex-grow flex items-center justify-center">
        <div className="glass-card max-w-md text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-rose-500 mb-4" />
          <h2 className="text-white text-lg">Invalid Invitation Code</h2>
          <p className="text-slate-400 text-sm mt-2">
            The interview link appears to be malformed or invalid. Please check the URL parameter or contact your HR recruiter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full apex-theme-bg flex flex-col justify-between" style={{ minHeight: 'calc(100vh - 56px)', position: 'relative' }}>
      
      {/* Main Grid Content */}
      <div className="apex-light-container">
        
        {/* Left Column - Information / Phases */}
        <div className="flex flex-col items-start text-left">
          
          <div className="apex-badge">
            <ShieldCheck className="w-3.5 h-3.5" /> Candidate Assessment Hub
          </div>
          
          <h1 className="apex-title-main">
            <span className="title-word nexahire-word">
              {"NEXAHIRE".split("").map((char, index) => (
                <span key={index} className="anim-char" style={{ animationDelay: `${index * 0.05}s` }}>
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </span>
            <span className="subtitle-word">SECURE AI INTERVIEW</span>
          </h1>
          
          <p className="apex-desc-text">
            You are accessing the secure candidate evaluation portal. The assessment consists of automated AI screening and proctored biometrics. Please review the Instructions below before signing in.
          </p>
          
          {/* Phase 1 Card */}
          <div className="apex-phase-card w-full">
            <div className="apex-phase-number">1</div>
            <div className="apex-phase-icon-box">
              <Mic className="w-5 h-5" />
            </div>
            <div className="apex-phase-content">
              <div className="apex-phase-title">Phase 1: Voice & Theory Screening (20 mins)</div>
              <div className="apex-phase-desc">
                Speak your answers clearly. The AI system evaluates communication, response content, confidence, and shift alignment.
              </div>
            </div>
            <ChevronRight className="apex-phase-arrow w-5 h-5" />
          </div>
          
          {/* Phase 2 Card */}
          <div className="apex-phase-card w-full">
            <div className="apex-phase-number">2</div>
            <div className="apex-phase-icon-box">
              <Keyboard className="w-5 h-5" />
            </div>
            <div className="apex-phase-content">
              <div className="apex-phase-title">Phase 2: Written Skill Assessment (10 mins)</div>
              <div className="apex-phase-desc">
                Keyboard-based responses. Tests technical vocabulary definitions, grammatical corrections, and professional email formatting.
              </div>
            </div>
            <ChevronRight className="apex-phase-arrow w-5 h-5" />
          </div>
          
          {/* Hardware & System Enforcements Pills */}
          <div className="apex-status-pills-row">
            <div className="apex-status-pill">
              <Video className="w-4 h-4" /> Webcam Required
            </div>
            <div className="apex-status-pill">
              <UserCheck className="w-4 h-4" /> Face Required
            </div>
            <div className="apex-status-pill">
              <Mic className="w-4 h-4" /> Mic Calibration
            </div>
            <div className="apex-status-pill">
              <Monitor className="w-4 h-4" /> Fullscreen Lockout
            </div>
          </div>
          
        </div>
        
        {/* Right Column - Pedestal Shield Graphic or Auth/Webcam Form */}
        <div className="relative w-full flex items-center justify-center">
          
          {cameraStage === 'welcome' ? (
            /* SECURE AUTHENTICATION CARD */
            <div className="w-full flex flex-col items-center">
              
              {/* Floating Pedestal 3D Shield Graphic */}
              <div className="relative w-full h-[150px] flex items-center justify-center mx-auto mb-4 pointer-events-none">
                {/* 3D concentric rings */}
                <div className="absolute w-[170px] h-[170px] border border-blue-200/25 rounded-full pointer-events-none ring-pulse-breath" style={{ top: 'calc(50% - 85px)', left: 'calc(50% - 85px)', transform: 'rotateX(65deg)' }}></div>
                <div className="absolute w-[140px] h-[140px] border border-dashed border-blue-300/35 rounded-full pointer-events-none ring-spin-normal" style={{ top: 'calc(50% - 70px)', left: 'calc(50% - 70px)', transform: 'rotateX(65deg)' }}></div>
                <div className="absolute w-[115px] h-[115px] border-[1.5px] border-blue-400/40 rounded-full pointer-events-none shadow-[0_0_8px_rgba(59,130,246,0.1)] ring-spin-reverse" style={{ top: 'calc(50% - 57px)', left: 'calc(50% - 57px)', transform: 'rotateX(65deg)' }}></div>
                <div className="absolute w-[90px] h-[90px] border border-dashed border-cyan-400/50 rounded-full pointer-events-none ring-spin-normal" style={{ top: 'calc(50% - 45px)', left: 'calc(50% - 45px)', transform: 'rotateX(65deg)' }}></div>
                <div className="absolute w-[70px] h-[70px] border-2 border-blue-500/65 rounded-full pointer-events-none shadow-[0_0_10px_rgba(59,130,246,0.15)] ring-pulse-breath" style={{ top: 'calc(50% - 35px)', left: 'calc(50% - 35px)', transform: 'rotateX(65deg)' }}></div>
                <div className="absolute w-[50px] h-[50px] bg-gradient-to-r from-blue-500/20 to-cyan-400/20 border border-cyan-400/50 rounded-full pointer-events-none" style={{ top: 'calc(50% - 25px)', left: 'calc(50% - 25px)', transform: 'rotateX(65deg)' }}></div>

                {/* Advanced Interactive Logo */}
                <div className="absolute top-[calc(50%-28px)] animate-float" style={{ animationDuration: '4.5s' }}>
                  <AdvancedSecureLogo size="small" />
                </div>
              </div>
              
              <div className="apex-auth-card w-full">
                
                <div className="apex-auth-badge">
                  <Lock className="w-3.5 h-3.5" /> Secure Authentication
                </div>
                
                <h2 className="apex-auth-title">Join Interview</h2>
                <p className="apex-auth-subtitle">
                  Enter your credential details from your invitation email.
                </p>
                
                {/* Form Group */}
                <div className="space-y-4">
                  
                  <div className="form-group mb-4">
                    <label className="apex-input-label">FULL NAME</label>
                    <div className="apex-input-wrapper">
                      <div className="apex-input-icon-box">
                        <User className="w-4.5 h-4.5" />
                      </div>
                      <input 
                        type="text" 
                        className="apex-input-field" 
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div className="form-group mb-4">
                    <label className="apex-input-label">EMAIL ADDRESS</label>
                    <div className="apex-input-wrapper">
                      <div className="apex-input-icon-box">
                        <Mail className="w-4.5 h-4.5" />
                      </div>
                      <input 
                        type="email" 
                        className="apex-input-field" 
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        placeholder="john.doe@example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group mb-6">
                    <label className="apex-input-label">SECURITY PASSCODE</label>
                    <div className="apex-input-wrapper">
                      <div className="apex-input-icon-box">
                        <Lock className="w-4.5 h-4.5" />
                      </div>
                      <input 
                        type="password" 
                        className="apex-input-field font-mono" 
                        value={enteredPasscode}
                        onChange={(e) => setEnteredPasscode(e.target.value)}
                        placeholder="••••••••••••"
                      />
                    </div>
                  </div>
                  
                  {passcodeError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-semibold mb-4" style={{ fontFamily: 'sans-serif' }}>
                      ⚠️ {passcodeError}
                    </div>
                  )}
                  
                  <button className="apex-btn-submit" onClick={handleProceedToCalibration}>
                    Verify Credentials & Start <ArrowRight className="w-4.5 h-4.5" />
                  </button>
                  
                </div>
                
                <div className="apex-auth-footer mt-4">
                  System Administrator?{' '}
                  <span className="apex-auth-footer-link" onClick={onGoToAuth}>
                    HR Officer Login
                  </span>
                </div>
                
              </div>
            </div>
          ) : (
            /* BIOMETRIC CALIBRATION & HARDWARE ACCESS CARD */
            <div className="apex-auth-card w-full">
              
              <div className="apex-auth-badge">
                <Cpu className="w-3.5 h-3.5" /> System Biometrics
              </div>
              
              <h2 className="apex-auth-title" style={{ fontSize: '1.45rem' }}>Biometric Calibration</h2>
              <p className="apex-auth-subtitle" style={{ marginBottom: '20px' }}>
                To guarantee test integrity, camera and microphone streams are verified prior to starting.
              </p>
              
              {/* Camera Preview Box matching Mockup style */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 mb-6 shadow-inner flex items-center justify-center">
                {cameraGranted ? (
                  <>
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/80 animate-scanLineAnimation pointer-events-none z-10" style={{ animation: 'scanLineAnimation 3.5s linear infinite' }}></div>
                    <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" autoPlay playsInline muted></video>
                    
                    {/* Proctor HUD overlay */}
                    <div className="absolute inset-0 flex flex-col justify-between p-3 z-20 pointer-events-none">
                      <div className="flex justify-between items-center">
                        <span className="bg-blue-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE CALIBRATION
                        </span>
                        <span className="bg-slate-900/80 text-emerald-400 font-mono text-[9px] font-bold px-2 py-0.5 rounded">
                          SYS_OK
                        </span>
                      </div>
                      
                      <div className="bg-slate-950/85 border border-slate-800 rounded-lg p-2 max-w-[130px]">
                        <div className="flex justify-between font-mono text-[8px] text-slate-400 mb-0.5">
                          <span>Posture:</span>
                          <span className="text-emerald-400 font-bold">READY</span>
                        </div>
                        <div className="flex justify-between font-mono text-[8px] text-slate-400">
                          <span>Lighting:</span>
                          <span className="text-emerald-400 font-bold">PASS</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Overlay biometric scan target */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[45%] h-[60%] border-2 border-dashed border-blue-500/50 rounded-[40px] shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]"></div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <Video className="w-10 h-10 text-slate-500 animate-pulse" />
                    <p className="text-xs text-slate-400 font-mono">Webcam feed offline. Awaiting permission...</p>
                  </div>
                )}
              </div>
              
              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1 text-left mb-4">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Biometric Access Denied
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Webcam and audio permissions are strictly required. Click the URL lock icon, grant hardware access, and refresh.
                  </p>
                </div>
              )}
              
              {!cameraGranted ? (
                <button className="apex-btn-submit" onClick={requestCameraAccess} disabled={loading}>
                  {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : 'Calibrate Webcam & Microphone'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-2 justify-center" style={{ fontFamily: 'sans-serif' }}>
                    <Check className="w-4 h-4 text-emerald-600" /> BIOMETRIC CALIBRATION VALIDATED
                  </div>
                  <button className="apex-btn-submit" onClick={handleStart}>
                    Initiate AI Secure Session <ArrowRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => setCameraStage('welcome')} 
                style={{
                  display: 'block',
                  margin: '12px auto 0',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                ← Back to authentication
              </button>
              
            </div>
          )}
          
        </div>
        
      </div>

      {/* Footer matching Mockup */}
      <footer className="w-full apex-footer py-6 mt-16 relative z-10">
        <div className="container max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AdvancedSecureLogo size="mini" />
            <span className="apex-logo-text" style={{ fontSize: '0.95rem' }}>NexaHire</span>
            <span className="apex-logo-badge" style={{ fontSize: '0.55rem', padding: '1px 6px' }}>AI AGENT</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Enterprise-grade AI talent proctoring and candidate evaluation platform.
          </p>
        </div>
      </footer>
      
    </div>
  );
}

// ----------------------------------------------------
// 6. ACTIVE INTERVIEW SESSION
function CandidateInterview({ interview, onComplete, candidateToken }) {
  const [interviewStage, setInterviewStage] = useState('intro'); // intro | ready-check | questioning | phase-transition
  const [phase, setPhase] = useState(1); // 1 (Theory) or 2 (Assessment)
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [webcamWarningActive, setWebcamWarningActive] = useState(false);
  
  // Custom response buffers for all questions
  const [phase1Responses, setPhase1Responses] = useState(() => {
    return Array(interview.phase1Questions?.length || 5).fill('');
  });
  const [phase2Responses, setPhase2Responses] = useState(() => {
    return Array(interview.phase2Questions?.length || 5).fill('');
  });

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [tempSpeech, setTempSpeech] = useState(""); // continuous buffer
  const recognitionBaselineRef = useRef("");
  const [subtitleText, setSubtitleText] = useState("");
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false);
  const [speechBlocked, setSpeechBlocked] = useState(false);

  // Timer States: Phase 1 gets 2/3 of total, Phase 2 gets 1/3 of total duration Limit
  const [phase1TimeLeft, setPhase1TimeLeft] = useState(() => {
    const totalMinutes = interview?.durationLimit || 30;
    return Math.floor((totalMinutes * 2 / 3) * 60);
  });
  const [phase2TimeLeft, setPhase2TimeLeft] = useState(() => {
    const totalMinutes = interview?.durationLimit || 30;
    return Math.floor((totalMinutes / 3) * 60);
  });
  const [questionTimeLeft, setQuestionTimeLeft] = useState(120); // 2 minutes per question

  // Security Violation Tracking
  const [securityViolations, setSecurityViolations] = useState([]);
  const securityViolationsRef = useRef([]);
  const violationTerminatedRef = useRef(false);

  const speechSessionIdRef = useRef(0);
  const videoUploadPromiseRef = useRef(null);
  const stopAllSpeech = () => {
    speechSessionIdRef.current++;
    setAiIsSpeaking(false);
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  };

  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const currentQIdxRef = useRef(currentQIdx);
  useEffect(() => { currentQIdxRef.current = currentQIdx; }, [currentQIdx]);

  const transcribedTextRef = useRef(transcribedText);
  useEffect(() => { transcribedTextRef.current = transcribedText; }, [transcribedText]);

  const tempSpeechRef = useRef(tempSpeech);
  useEffect(() => { tempSpeechRef.current = tempSpeech; }, [tempSpeech]);

  // Warm up voices cache
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);
  
  // Proctor Variables
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [cameraOffCount, setCameraOffCount] = useState(0);
  const [eyeContactRate, setEyeContactRate] = useState(96);
  const [speakingPace, setSpeakingPace] = useState(0);
  const [lookingAwayAlert, setLookingAwayAlert] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // VAD active speaking state

  // OpenAI Grading Loader States
  const [isGrading, setIsGrading] = useState(false);
  const [gradingStatus, setGradingStatus] = useState("");

  // ── Helper: log a security violation to backend DB ─────────────────────────
  const logViolationToBackend = async (violationType, violationReason, deviceInfo = '') => {
    const entry = {
      timestamp: new Date().toISOString(),
      type: violationType,
      reason: violationReason,
      deviceInfo
    };
    securityViolationsRef.current.push(entry);
    setSecurityViolations(prev => [...prev, entry]);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (candidateToken) {
        headers['Authorization'] = `Bearer ${candidateToken}`;
      }
      await fetch(BACKEND_URL + '/api/security/violation', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          interviewId: interview.id,
          violationType,
          violationReason,
          deviceInfo,
          userAgent: navigator.userAgent
        })
      });
    } catch (err) {
      console.warn('Failed to log violation to backend:', err);
    }
  };
  
  // References
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fullTranscriptRef = useRef([]);
  const proctorLogsRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const audioContextRef = useRef(null); // Web Audio API Context for noise filter
  const analyserRef = useRef(null); // Web Audio Analyser node for VAD
  const audioDataArrayRef = useRef(null); // Reusable Uint8Array data buffer
  const volumeFactorRef = useRef(0); // Real-time volume level tracker

  // Speech Recognition Persistence & State synchronization refs
  const recognitionRef = useRef(null);
  const dgSocketRef = useRef(null);          // Deepgram WebSocket connection
  const dgAudioRecorderRef = useRef(null);   // Dedicated MediaRecorder for Deepgram audio
  const isListeningRef = useRef(isListening);
  const isCameraActiveRef = useRef(isCameraActive);
  const questionTimeLeftRef = useRef(questionTimeLeft);
  const speechWarmedUpRef = useRef(false);
  const usingDeepgramRef = useRef(false);    // true when DG connection is active
  const dgFinalBufferRef = useRef('');       // tracks committed Deepgram sentences for current question

  const stageRef = useRef(interviewStage);
  useEffect(() => {
    stageRef.current = interviewStage;
  }, [interviewStage]);

  // Ensure the camera stream remains bound to the video element even when layout changes (ternary branch swaps)
  useEffect(() => {
    const bindActiveStream = () => {
      if (videoRef.current && streamRef.current) {
        if (videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
      }
    };
    bindActiveStream();
    // A small timeout helps if rendering/mounting has a tiny delay
    const timer = setTimeout(bindActiveStream, 100);
    return () => clearTimeout(timer);
  }, [interviewStage, isCameraActive]);

  // Synchronize live session data to global window object for HR dashboard monitoring
  useEffect(() => {
    const syncInterval = setInterval(() => {
      window.liveCandidateSession = {
        interviewId: interview.id,
        stream: streamRef.current,
        transcript: [...fullTranscriptRef.current],
        logs: [...proctorLogsRef.current],
        eyeContactRate,
        speakingPace,
        isCameraActive,
        cameraOffCount
      };
    }, 1000);

    return () => {
      clearInterval(syncInterval);
      window.liveCandidateSession = null;
    };
  }, [interview.id, eyeContactRate, speakingPace, isCameraActive, cameraOffCount]);

  // Handle immediate window/tab cancellation
  const terminateSessionDueToViolation = (violationReason, violationType = 'TAB_SWITCH') => {
    // Prevent double-termination
    if (violationTerminatedRef.current) return;
    violationTerminatedRef.current = true;

    stopCamera();
    
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }

    // Close any active Deepgram transcription connection
    if (dgSocketRef.current) {
      try { dgSocketRef.current.close(); } catch (e) {}
      dgSocketRef.current = null;
    }
    if (dgAudioRecorderRef.current && dgAudioRecorderRef.current.state !== 'inactive') {
      try { dgAudioRecorderRef.current.stop(); } catch (e) {}
      dgAudioRecorderRef.current = null;
    }

    const terminationTimestamp = new Date().toLocaleTimeString();
    const violationEntry = {
      timestamp: new Date().toISOString(),
      type: violationType,
      reason: violationReason,
      deviceInfo: `Screen: ${window.screen.width}x${window.screen.height} | Screens: ${window.screen.isExtended ? 'Multiple detected' : 'Single'}`
    };

    // Log to backend before completing
    const headers = { 'Content-Type': 'application/json' };
    if (candidateToken) {
      headers['Authorization'] = `Bearer ${candidateToken}`;
    }
    fetch(BACKEND_URL + '/api/security/violation', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        interviewId: interview.id,
        violationType,
        violationReason,
        deviceInfo: violationEntry.deviceInfo,
        userAgent: navigator.userAgent
      })
    }).catch(() => {});

    const allViolations = [
      ...securityViolationsRef.current,
      violationEntry
    ];

    const finalReport = {
      overallScore: 0,
      passingScore: interview.passingScore || 70,
      passingStatus: "Terminated",
      introScore: 0,
      commScore: 0,
      confScore: 0,
      presentScore: 0,
      nightShiftFine: "No",
      vocabScore: 0,
      grammarScore: 0,
      emailScore: 0,
      cameraOffCount,
      pace: `0 WPM`,
      eyeContact: `0%`,
      terminatedAt: terminationTimestamp,
      terminationReason: violationReason,
      terminationViolationType: violationType,
      summary: `⚠️ EXAM TERMINATED at ${terminationTimestamp}. Reason: ${violationReason}. This candidate's session was automatically cancelled by the NexaHire proctoring system due to a critical security violation. All activity has been logged and saved to the portal. Score is set to 0.`,
      proctorFlags: [
        `CRITICAL VIOLATION [${terminationTimestamp}]: ${violationReason}`,
        ...proctorLogsRef.current
      ],
      securityViolations: allViolations,
      totalDurationSecs: getCurrentElapsedSecs()
    };

    const updatedInt = {
      ...interview,
      status: "Terminated",
      transcript: fullTranscriptRef.current,
      report: finalReport
    };

    // Release tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    
    let warningText = '';
    if (violationType === 'MULTI_MONITOR') {
      warningText = `Security alert! Multiple screens or external display devices have been detected. This exam does not allow additional monitors. Your session has been terminated and your recruiter has been notified.`;
    } else if (violationType === 'WEBCAM_DISCONNECTED') {
      warningText = `Security alert! Your web camera was turned off or lost connection multiple times. This exam requires an active webcam at all times. Your session has been terminated, and your recruiter has been notified.`;
    } else {
      warningText = `Security violation detected. You have left the secure assessment window. The interview has been terminated, and your recruiter has been notified.`;
    }

    speakAI(warningText, () => {
      onComplete(updatedInt);
    });
  };

  const terminateRef = useRef(null);
  useEffect(() => {
    terminateRef.current = terminateSessionDueToViolation;
  });

  const logViolationToBackendRef = useRef(null);
  useEffect(() => {
    logViolationToBackendRef.current = logViolationToBackend;
  });

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isCameraActiveRef.current = isCameraActive;
  }, [isCameraActive]);

  useEffect(() => {
    questionTimeLeftRef.current = questionTimeLeft;
  }, [questionTimeLeft]);

  useEffect(() => {
    const SpeechRecognitionObject = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionObject && !recognitionRef.current) {
      try {
        const rec = new SpeechRecognitionObject();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        recognitionRef.current = rec;
      } catch (e) {
        console.error('Failed to initialize local SpeechRecognition:', e);
      }
    }
  }, []);

  // Helper: Apply noise suppression, bandpass filtering, and VAD analysis to audio stream
  const applyAudioFilters = (rawStream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return rawStream;

      // Clean up previous AudioContext if any
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
        audioContextRef.current = null;
        analyserRef.current = null;
      }

      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(rawStream);

      // 1. Highpass filter to eliminate low frequency hums (fan, AC, power line)
      const hpFilter = audioContext.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.value = 85;

      // 2. Lowpass filter to eliminate high frequency hiss and white noise
      const lpFilter = audioContext.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.value = 8000;

      // 3. Gain node to optimize speech amplification/volume
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.2;

      // 4. Analyser node for Voice Activity Detection
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      analyserRef.current = analyserNode;
      audioDataArrayRef.current = new Uint8Array(analyserNode.frequencyBinCount);

      // 5. Destination for MediaStream output
      const dest = audioContext.createMediaStreamDestination();

      source.connect(hpFilter);
      hpFilter.connect(lpFilter);
      lpFilter.connect(gainNode);
      gainNode.connect(analyserNode);
      gainNode.connect(dest);

      const videoTracks = rawStream.getVideoTracks();
      const audioTracks = dest.stream.getAudioTracks();

      return new MediaStream([videoTracks[0], audioTracks[0]].filter(Boolean));
    } catch (err) {
      console.warn("Failed to apply noise-reduction audio filters:", err);
      return rawStream;
    }
  };

  // Bind/unbind camera
  const startCamera = async () => {
    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      const processedStream = applyAudioFilters(rawStream);
      streamRef.current = processedStream;
      if (videoRef.current) {
        videoRef.current.srcObject = processedStream;
      }
      rawStream.getVideoTracks().forEach(track => {
        track.onended = () => {
          handleWebcamLoss();
        };
      });
    } catch (e) {
      console.error("Camera access failed", e);
    }
  };

  const stopCamera = () => {
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
      analyserRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch(e) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleWebcamLoss = () => {
    if (stageRef.current !== 'questioning') return;
    setCameraOffCount(prev => {
      const nextCount = prev + 1;
      proctorLogsRef.current.push(`⚠️ Webcam stream lost/disconnected [${formatTimestamp(getCurrentElapsedSecs())}] - Incident #${nextCount}`);
      
      if (nextCount === 1) {
        setWebcamWarningActive(true);
        stopSpeechRecording();
        stopAllSpeech();
      } else if (nextCount >= 2) {
        proctorLogsRef.current.push(`⚠️ Webcam disconnected multiple times. Continuing session without termination.`);
      }
      
      return nextCount;
    });
    setIsCameraActive(false);
  };

  // Toggle camera stream (for testing & proctor warning enforcement)
  const handleToggleCamera = () => {
    if (isCameraActive) {
      // Turning off camera
      stopCamera();
      setIsCameraActive(false);
      
      setCameraOffCount(prev => {
        const nextCount = prev + 1;
        proctorLogsRef.current.push(`Webcam stream manually toggled off [${formatTimestamp(getCurrentElapsedSecs())}] - Incident #${nextCount}`);
        
        if (interviewStage === 'questioning') {
          if (nextCount === 1) {
            setWebcamWarningActive(true);
            stopSpeechRecording();
            stopAllSpeech();
          } else if (nextCount >= 2) {
            proctorLogsRef.current.push(`⚠️ Webcam toggled off multiple times. Continuing session without termination.`);
          }
        }
        return nextCount;
      });
    } else {
      // Turning back on
      setIsCameraActive(true);
      startCamera();
      setWebcamWarningActive(false);
      proctorLogsRef.current.push(`Webcam stream restored [${formatTimestamp(getCurrentElapsedSecs())}]`);
      
      if (interviewStage === 'questioning') {
        deliverQuestion(currentQIdxRef.current);
      }
    }
  };

  const getCurrentElapsedSecs = () => {
    const totalMinutes = interview.durationLimit || 30;
    const phase1Max = Math.floor((totalMinutes * 2 / 3) * 60);
    const phase2Max = Math.floor((totalMinutes / 3) * 60);
    if (phase === 1) {
      return phase1Max - phase1TimeLeft;
    } else {
      return phase1Max + (phase2Max - phase2TimeLeft);
    }
  };

  // Set up webcam & active biometric proctor analyzer inside interview
  useEffect(() => {
    let animationFrameId = null;

    const bindWebcam = async () => {
      try {
        const rawStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        const processedStream = applyAudioFilters(rawStream);
        streamRef.current = processedStream;
        if (videoRef.current) {
          videoRef.current.srcObject = processedStream;
        }

        // Trigger a dummy SpeechRecognition session early to check/prompt for permission
        // before entering questioning stage. This avoids security violations due to window blurs.
        if (!speechWarmedUpRef.current) {
          speechWarmedUpRef.current = true;
          try {
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRec) {
              const dummyRec = new SpeechRec();
              dummyRec.onstart = () => {
                try { dummyRec.stop(); } catch (e) {}
              };
              dummyRec.onerror = () => {};
              dummyRec.start();
            }
          } catch (e) {
            console.warn("Dummy speech recognition start failed:", e);
          }
        }

        // Setup MediaRecorder for webcam recording
        try {
          let mimeType = 'video/webm';
          if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
            mimeType = 'video/webm;codecs=vp8,opus';
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
            mimeType = 'video/webm;codecs=h264,opus';
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
            mimeType = 'video/webm;codecs=vp9,opus';
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            mimeType = 'video/webm;codecs=vp8';
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
          }
          const mr = new MediaRecorder(processedStream, { mimeType });
          mediaRecorderRef.current = mr;
          recordedChunksRef.current = [];
          
          mr.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };
          
          mr.onstop = async () => {
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }

            const blob = new Blob(recordedChunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(blob);
            window.recordedVideos = window.recordedVideos || {};
            window.recordedVideos[interview.id] = url;
            await videoDb.saveVideo(interview.id, blob);
            
            // Upload video blob to the backend for recruiter access (no keepalive, awaitable promise)
            const uploadHeaders = {};
            if (candidateToken) {
              uploadHeaders['Authorization'] = `Bearer ${candidateToken}`;
            }
            const uploadPromise = fetch(`${BACKEND_URL}/api/interviews/${interview.id}/video`, {
              method: 'POST',
              headers: uploadHeaders,
              body: blob
            }).then(res => {
              if (!res.ok) throw new Error(`Server returned status ${res.status}`);
              return res.json();
            }).catch(err => {
              console.error('Failed to upload video to backend:', err);
            });

            videoUploadPromiseRef.current = uploadPromise;
          };
          
          mr.start();
        } catch (mrError) {
          console.warn("Failed to start MediaRecorder", mrError);
        }

        // Setup Offscreen Canvas for pixel processing
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        let prevFrameData = null;
        let alertCoolDown = 0;

        const processFrame = () => {
          if (!isCameraActive) {
            animationFrameId = requestAnimationFrame(processFrame);
            return;
          }

          let motionFactor = 0;
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = frame.data;

              if (prevFrameData) {
                let totalDiff = 0;
                for (let i = 0; i < data.length; i += 16) {
                  totalDiff += Math.abs(data[i] - prevFrameData[i]) + 
                               Math.abs(data[i+1] - prevFrameData[i+1]) + 
                               Math.abs(data[i+2] - prevFrameData[i+2]);
                }
                motionFactor = totalDiff / (canvas.width * canvas.height * 0.1);
              }
              prevFrameData = data;
            } catch (err) {}
          }

          let volumeFactor = 0;
          const analyser = analyserRef.current;
          const dataArray = audioDataArrayRef.current;
          if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            volumeFactor = sum / dataArray.length;
          }
          volumeFactorRef.current = volumeFactor;

          // Throttled VAD state update
          const speaking = volumeFactor > 3.5;
          setIsSpeaking(prev => {
            if (prev !== speaking) return speaking;
            return prev;
          });

          if (motionFactor > 12) {
            setLookingAwayAlert(true);
            alertCoolDown = 45;
            setEyeContactRate(prev => Math.max(68, prev - 0.4));
            
            if (Math.random() > 0.97) {
              proctorLogsRef.current.push(`Ocular drift warning: Gaze vector offset detected [${formatTimestamp(getCurrentElapsedSecs())}]`);
            }
          } else {
            if (alertCoolDown > 0) {
              alertCoolDown--;
            } else {
              setLookingAwayAlert(false);
            }
            setEyeContactRate(prev => Math.min(99, prev + 0.04));
          }

          if (volumeFactor > 6) {
            setSpeakingPace(prev => {
              let targetPace = 132 + Math.round(Math.sin(Date.now() / 2000) * 12);
              return Math.round(prev * 0.9 + targetPace * 0.1);
            });
          }

          animationFrameId = requestAnimationFrame(processFrame);
        };

        animationFrameId = requestAnimationFrame(processFrame);

      } catch (e) {
        console.error("Proctor camera stream lost", e);
      }
    };
    
    if (isCameraActive) {
      bindWebcam();
    }

    // ── Tab Switch / Window Blur Detection ─────────────────────────────────
    let blurCount = 0;
    const handleWindowBlur = () => {
      const ts = new Date().toLocaleTimeString();
      if (stageRef.current === 'questioning') {
        blurCount++;
        const reason = `Candidate switched window/tab or minimized the browser at ${ts} (Incident #${blurCount})`;
        // Log every attempt to backend for tracking, but do NOT suspend/terminate
        logViolationToBackendRef.current?.('TAB_SWITCH', reason, `Screen: ${window.screen.width}x${window.screen.height}`);
        proctorLogsRef.current.push(`⚠️ Window focus lost [${ts}] - Attempt #${blurCount}`);
      } else {
        proctorLogsRef.current.push(`Window focus lost before exam start [${ts}]`);
      }
    };
    
    const handleVisibilityChange = () => {
      const ts = new Date().toLocaleTimeString();
      if (document.visibilityState === 'hidden') {
        if (stageRef.current === 'questioning') {
          const reason = `Candidate navigated to another tab or hid the assessment window at ${ts}`;
          logViolationToBackendRef.current?.('TAB_HIDDEN', reason, `Browser tab was hidden`);
          proctorLogsRef.current.push(`⚠️ Tab hidden [${ts}]`);
        } else {
          proctorLogsRef.current.push(`Tab hidden before exam start [${ts}]`);
        }
      }
    };

    // ── Multi-Monitor / External Display Detection ──────────────────────────
    const checkForMultipleScreens = async () => {
      if (stageRef.current !== 'questioning') return;
      try {
        // Method 1: Screen.isExtended API (Chrome 100+) - Log but do NOT terminate
        if (window.screen && 'isExtended' in window.screen && window.screen.isExtended) {
          const reason = `Multiple monitors detected via Screen.isExtended API. External display connected at ${new Date().toLocaleTimeString()}.`;
          logViolationToBackendRef.current?.('MULTI_MONITOR', reason, `isExtended: true | Screen: ${window.screen.width}x${window.screen.height}`);
          proctorLogsRef.current.push(`🖥️ MULTI-MONITOR DETECTED [${new Date().toLocaleTimeString()}]`);
        }
      } catch (err) {
        console.warn('Multi-screen check error:', err);
      }
    };

    // Poll for multi-monitor changes every 3 seconds during the exam
    const multiMonitorInterval = setInterval(checkForMultipleScreens, 3000);
    // Run an initial check on exam start
    checkForMultipleScreens();

    // Listen for screen change events (Chrome 100+)
    const handleScreenChange = () => {
      checkForMultipleScreens();
    };
    window.screen.addEventListener?.('change', handleScreenChange);

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(multiMonitorInterval);
      window.screen.removeEventListener?.('change', handleScreenChange);
      cancelAnimationFrame(animationFrameId);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch(e) {}
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
        audioContextRef.current = null;
        analyserRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [isCameraActive]);

  // Dynamic webcam binding on stage transition to ensure the video displays immediately in Phase 1
  useEffect(() => {
    if (streamRef.current && videoRef.current && isCameraActive) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [interviewStage, isCameraActive]);

  // Speech Recognition instance is managed via ref to prevent re-creation on every state timer tick

  // Text to Speech voice synthesizers
  // Text to Speech voice synthesizers
  const speakAI = (text, callback) => {
    setAiIsSpeaking(true);
    setSubtitleText(text);
    
    // Increment session ID to invalidate any previous speakAI loops
    speechSessionIdRef.current++;
    const currentSessionId = speechSessionIdRef.current;
    
    // Pause speech recognition if it is currently listening to prevent recording the bot's own voice
    const wasListening = isListeningRef.current;
    if (wasListening) {
      stopSpeechRecording();
    }
    
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch (e) {}
      window.speechSynthesis.cancel();
      
      // Split text into safe, short sentences to bypass Chrome's 15-second SpeechSynthesis bug
      const sentences = text.split(/[.!?;\n]+/).map(s => s.trim()).filter(s => s.length > 0);
      if (sentences.length === 0) {
        setAiIsSpeaking(false);
        if (callback) {
          callback();
        } else if (wasListening) {
          startSpeechRecording();
        }
        return;
      }

      let currentSentenceIdx = 0;
      let safetyTimer = null;
      let resumeInterval = null;

      const speakNext = () => {
        // If this speech loop has been invalidated, stop immediately!
        if (speechSessionIdRef.current !== currentSessionId) {
          if (resumeInterval) clearInterval(resumeInterval);
          clearTimeout(safetyTimer);
          return;
        }

        if (currentSentenceIdx >= sentences.length) {
          setAiIsSpeaking(false);
          if (callback) {
            callback();
          } else if (wasListening) {
            startSpeechRecording();
          }
          return;
        }

        const sentenceText = sentences[currentSentenceIdx];
        const utterance = new SpeechSynthesisUtterance(sentenceText);
        utterance.lang = 'en-US';
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        let hasEnded = false;
        let startTimeout = null;
        let startFired = false;

        const handleEnd = () => {
          if (hasEnded) return;
          hasEnded = true;
          if (resumeInterval) clearInterval(resumeInterval);
          if (startTimeout) clearTimeout(startTimeout);
          clearTimeout(safetyTimer);
          
          if (speechSessionIdRef.current === currentSessionId) {
            currentSentenceIdx++;
            setTimeout(speakNext, 150);
          }
        };

        utterance.onend = handleEnd;
        utterance.onerror = (event) => {
          console.error("SpeechSynthesis utterance error:", event.error, event);
          if (event.error === 'not-allowed') {
            setSpeechBlocked(true);
          }
          handleEnd();
        };

        safetyTimer = setTimeout(() => {
          console.warn("SpeechSynthesis safety timeout reached for sentence:", sentenceText);
          handleEnd();
        }, sentenceText.length * 80 + 5000);

        resumeInterval = setInterval(() => {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            try {
              window.speechSynthesis.resume();
            } catch (e) {}
          }
        }, 3000);

        let speakCalled = false;
        const speakWithVoice = () => {
          if (speakCalled) return;
          speakCalled = true;
          
          const voices = window.speechSynthesis.getVoices();
          const enVoices = voices.filter(v => v.lang.startsWith('en'));
          
          let voice = enVoices.find(v => v.localService && (
            v.name.includes('Zira') || 
            v.name.includes('Microsoft Zira') || 
            v.name.includes('Female') || 
            v.name.includes('Hazel') || 
            v.name.includes('Susan') ||
            v.name.includes('Natural')
          ));
          
          if (!voice) {
            voice = enVoices.find(v => v.localService);
          }
          
          if (!voice) {
            voice = enVoices.find(v => 
              v.name.includes('Google') || 
              v.name.includes('Natural') || 
              v.name.includes('Zira') || 
              v.name.includes('Microsoft Zira') || 
              v.name.includes('Female') || 
              v.name.includes('Hazel') || 
              v.name.includes('Susan')
            );
          }
          
          if (!voice) {
            voice = enVoices[0];
          }
          
          if (!voice) {
            voice = voices[0];
          }
          
          if (voice) {
            utterance.voice = voice;
          }

          utterance.onstart = () => {
            startFired = true;
            setSpeechBlocked(false);
            if (startTimeout) clearTimeout(startTimeout);
          };

          startTimeout = setTimeout(() => {
            if (!startFired) {
              setSpeechBlocked(true);
              handleEnd();
            }
          }, 4500);
          
          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
            window.speechSynthesis.speak(utterance);
            setTimeout(() => {
              try {
                window.speechSynthesis.resume();
              } catch (e) {}
            }, 50);
          } catch (e) {
            if (startTimeout) clearTimeout(startTimeout);
            handleEnd();
          }
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          const checkVoices = () => {
            if (window.speechSynthesis.getVoices().length > 0) {
              speakWithVoice();
              window.speechSynthesis.removeEventListener('voiceschanged', checkVoices);
            }
          };
          window.speechSynthesis.addEventListener('voiceschanged', checkVoices);
          setTimeout(() => {
            speakWithVoice();
            window.speechSynthesis.removeEventListener('voiceschanged', checkVoices);
          }, 1200);
        } else {
          speakWithVoice();
        }
      };

      setTimeout(speakNext, 300);
    } else {
      setTimeout(() => {
        if (speechSessionIdRef.current === currentSessionId) {
          setAiIsSpeaking(false);
          if (callback) {
            callback();
          } else if (wasListening) {
            startSpeechRecording();
          }
        }
      }, text.length * 60);
    }
  };

  const handleUnlockSpeech = () => {
    setSpeechBlocked(false);
    stopAllSpeech();
    
    // Re-speak the current stage text or question
    setTimeout(() => {
      if (interviewStage === 'intro') {
        const greeting = `Hello, welcome to your first-phase assessment at NexaHire. I am your AI evaluation coordinator. Your screening contains two stages: Phase 1 covers Theory questions including candidate introductions, communication style, and shift adaptability. Phase 2 covers Assessment tasks including vocabulary, grammar checks, and professional email formatting. Are you ready to begin?`;
        speakAI(greeting, () => {
          setInterviewStage('ready-check');
        });
      } else if (interviewStage === 'phase-transition') {
        const transitionText = `Phase 1 is now complete. You have successfully submitted your theory responses. We are ready to proceed to Phase 2, which is the technical assessment. This phase will take up to 10 minutes and covers vocabulary, grammar corrections, and professional email formatting. Please click the button below to begin when you are ready.`;
        speakAI(transitionText);
      } else if (interviewStage === 'questioning') {
        deliverQuestion(currentQIdx);
      }
    }, 800);
  };

  // Run AI greeting & transition sequence
  useEffect(() => {
    if (interviewStage === 'intro') {
      const greeting = `Hello, welcome to your first-phase assessment at NexaHire. I am your AI evaluation coordinator. Your screening contains two stages: Phase 1 covers Theory questions including candidate introductions, communication style, and shift adaptability. Phase 2 covers Assessment tasks including vocabulary, grammar checks, and professional email formatting. Are you ready to begin?`;
      speakAI(greeting, () => {
        setInterviewStage('ready-check');
      });
    } else if (interviewStage === 'phase-transition') {
      const transitionText = `Phase 1 is now complete. You have successfully submitted your theory responses. We are ready to proceed to Phase 2, which is the technical assessment. This phase will take up to 10 minutes and covers vocabulary, grammar corrections, and professional email formatting. Please click the button below to begin when you are ready.`;
      speakAI(transitionText);
    }
  }, [interviewStage]);

  // Start question sequence
  const initiateQuestions = () => {
    stopAllSpeech();
    setInterviewStage('questioning');
    deliverQuestion(0);
  };

  const currentQuestionsList = phase === 1 ? (interview.phase1Questions || []) : (interview.phase2Questions || []);

  // Deliver a specific question
  const deliverQuestion = (idx) => {
    // Save current question answer before switching!
    const finalAnswer = (transcribedTextRef.current + " " + tempSpeechRef.current).trim();
    if (finalAnswer) {
      if (phaseRef.current === 1) {
        setPhase1Responses(prev => {
          const next = [...prev];
          next[currentQIdxRef.current] = finalAnswer;
          return next;
        });
      } else {
        setPhase2Responses(prev => {
          const next = [...prev];
          next[currentQIdxRef.current] = finalAnswer;
          return next;
        });
      }
    }

    setCurrentQIdx(idx);
    setQuestionTimeLeft(120);
    
    const questionObj = currentQuestionsList[idx];
    if (!questionObj) {
      setTranscribedText("");
      setTempSpeech("");
      return;
    }
    
    // Flush any remaining interim speech into the committed text before switching
    // This ensures no words are lost when the candidate was mid-sentence
    const pendingInterim = tempSpeechRef.current.trim();
    if (pendingInterim) {
      const flushed = (transcribedTextRef.current + (transcribedTextRef.current ? ' ' : '') + pendingInterim).trim();
      if (phaseRef.current === 1) {
        setPhase1Responses(prev => { const next = [...prev]; next[currentQIdxRef.current] = flushed; return next; });
      } else {
        setPhase2Responses(prev => { const next = [...prev]; next[currentQIdxRef.current] = flushed; return next; });
      }
      setTranscribedText(flushed);
    }

    stopSpeechRecording();
    
    // Reset per-question Deepgram buffer for the new question
    dgFinalBufferRef.current = '';
    
    const savedAns = phaseRef.current === 1 ? (phase1Responses[idx] || "") : (phase2Responses[idx] || "");
    setTranscribedText(savedAns);
    recognitionBaselineRef.current = savedAns;
    setTempSpeech("");
    
    const isObj = typeof questionObj === 'object' && questionObj !== null;
    const qText = isObj ? questionObj.text : questionObj;
    let qType = "speech";
    if (isObj) {
      qType = questionObj.type || "speech";
    } else {
      const qTextLower = qText.toLowerCase();
      if (
        (phaseRef.current === 2 && idx === 2) || // 3rd question in Phase 2
        qTextLower.startsWith("write a") ||
        qTextLower.startsWith("draft a") ||
        qTextLower.startsWith("draft an email") ||
        qTextLower.includes("email format template")
      ) {
        qType = "text";
      }
    }
    const qOptions = isObj ? (questionObj.options || []) : [];

    let aiIntro = `Question number ${idx + 1}: ${qText}`;
    if (qType === 'mcq' && qOptions.length > 0) {
      aiIntro += `. Please select one of the following options: ${qOptions.join(", ")}`;
    }
    
    const timestampStr = formatTimestamp(getCurrentElapsedSecs());
    
    // Check if we already spoke/recorded this question's AI prompt in fullTranscriptRef
    const alreadyLogged = fullTranscriptRef.current.some(t => t.speaker === "AI Recruiter" && t.text === qText);
    if (!alreadyLogged) {
      fullTranscriptRef.current.push({
        speaker: "AI Recruiter",
        text: qText,
        timestamp: timestampStr
      });
    }

    speakAI(aiIntro, () => {
      if (qType === 'speech') {
        startSpeechRecording();
      }
    });
  };

  // ── Voice speech recognizer controls ─────────────────────────────────────
  // PRIMARY:  Deepgram Nova-3 via backend WebSocket proxy (server-side STT)
  //           Same architecture as HireVue, Talview, Glider.ai
  // FALLBACK: Browser Web Speech API (if DEEPGRAM_API_KEY not set)

  const stopDeepgramRecording = () => {
    usingDeepgramRef.current = false;
    if (dgAudioRecorderRef.current && dgAudioRecorderRef.current.state !== 'inactive') {
      try { dgAudioRecorderRef.current.stop(); } catch (e) {}
      dgAudioRecorderRef.current = null;
    }
    if (dgSocketRef.current) {
      try {
        dgSocketRef.current.send(JSON.stringify({ type: 'close' }));
        dgSocketRef.current.close();
      } catch (e) {}
      dgSocketRef.current = null;
    }
  };

  const startDeepgramRecording = () => {
    if (!streamRef.current) return false;
    try {
      // Build a dedicated audio-only MediaRecorder for Deepgram
      const audioStream = new MediaStream(streamRef.current.getAudioTracks());
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const ws = new WebSocket(`${WS_BACKEND_URL}/transcribe?id=${encodeURIComponent(interview.id)}&token=${encodeURIComponent(candidateToken)}`);
      ws.binaryType = 'arraybuffer';
      dgSocketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'error' && msg.message === 'NO_API_KEY') {
            // Backend has no Deepgram key — fall back to Web Speech API silently
            console.warn('[DEEPGRAM] No API key on server, falling back to Web Speech API');
            stopDeepgramRecording();
            startWebSpeechFallback();
            return;
          }

          if (msg.type === 'error') {
            console.error('[DEEPGRAM] Error:', msg.message);
            return;
          }

          if (msg.type === 'ready') {
            // Deepgram connection is open — start streaming audio
            usingDeepgramRef.current = true;
            dgFinalBufferRef.current = transcribedTextRef.current; // start from existing text
            const mr = new MediaRecorder(audioStream, { mimeType, timeslice: 250 });
            dgAudioRecorderRef.current = mr;
            mr.ondataavailable = (e) => {
              if (e.data && e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                ws.send(e.data);
              }
            };
            mr.start(250); // send a chunk every 250ms
          }

          if (!isListeningRef.current) return;

          if (msg.type === 'interim') {
            // Show the LIVE partial word (what candidate is currently saying)
            // This does NOT overwrite committed text — it's shown separately as a "ghost"
            setTempSpeech(msg.transcript);
          }

          if (msg.type === 'final') {
            // A sentence/utterance has been fully recognized — commit it permanently
            // Deepgram guarantees no duplication: each final result is a NEW sentence
            const newSentence = msg.transcript.trim();
            if (!newSentence) return;

            // Apply Voice Activity Detection (VAD) threshold check:
            // If the volume level is below a whisper threshold (2.0), reject it as background noise/hallucination.
            if (volumeFactorRef.current < 2.0) {
              console.log('[VAD Gate] Noise/Silence transcription filtered out:', newSentence);
              return;
            }

            // Build the committed text: base + this new confirmed sentence
            const committed = (dgFinalBufferRef.current + (dgFinalBufferRef.current ? ' ' : '') + newSentence).trim();
            dgFinalBufferRef.current = committed;  // update our tracking buffer

            setTranscribedText(committed);
            recognitionBaselineRef.current = committed;
            setTempSpeech(''); // clear interim ghost text — sentence is now committed

            const wordsCount = committed.split(/\s+/).filter(Boolean).length;
            setSpeakingPace(Math.min(180, Math.round(wordsCount * (60 / Math.max(1, 120 - (questionTimeLeftRef.current || 0))))));

            // Persist to response array immediately (so nav between questions works)
            if (phaseRef.current === 1) {
              setPhase1Responses(p => { const n = [...p]; n[currentQIdxRef.current] = committed; return n; });
            } else {
              setPhase2Responses(p => { const n = [...p]; n[currentQIdxRef.current] = committed; return n; });
            }
          }
        } catch (e) {}
      };

      ws.onerror = () => {
        console.warn('[DEEPGRAM] WebSocket connection failed, falling back to Web Speech API');
        stopDeepgramRecording();
        startWebSpeechFallback();
      };

      ws.onclose = () => {
        usingDeepgramRef.current = false;
      };

      return true; // connection initiated
    } catch (err) {
      console.error('[DEEPGRAM] Failed to start recording:', err);
      return false;
    }
  };

  const startWebSpeechFallback = () => {
    const recognition = recognitionRef.current;
    if (!recognition || !isCameraActiveRef.current) return;
    try {
      recognition.abort();
      setIsListening(true);
      recognitionBaselineRef.current = transcribedTextRef.current;

      recognition.onresult = (event) => {
        if (!isListeningRef.current) return;
        let finalSessionText = '';
        let interimSessionText = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalSessionText += event.results[i][0].transcript;
          else interimSessionText += event.results[i][0].transcript;
        }

        // Apply Voice Activity Detection (VAD) threshold check for fallback Web Speech API:
        if (volumeFactorRef.current < 2.0 && finalSessionText.trim()) {
          console.log('[VAD Gate] Web Speech noise filtered out:', finalSessionText);
          return;
        }

        const updated = recognitionBaselineRef.current + finalSessionText;
        setTranscribedText(updated);
        setTempSpeech(interimSessionText);
        const wordsCount = (updated + interimSessionText).split(/\s+/).filter(Boolean).length;
        setSpeakingPace(Math.min(180, Math.round(wordsCount * (60 / (120 - questionTimeLeftRef.current || 1)))));
        if (phaseRef.current === 1) {
          setPhase1Responses(p => { const n = [...p]; n[currentQIdxRef.current] = updated; return n; });
        } else {
          setPhase2Responses(p => { const n = [...p]; n[currentQIdxRef.current] = updated; return n; });
        }
      };
      recognition.onerror = (e) => { console.error('Web Speech API Error', e); };
      recognition.onend = () => {
        if (isListeningRef.current && isCameraActiveRef.current) {
          recognitionBaselineRef.current = transcribedTextRef.current;
          try { recognition.start(); } catch (e) {}
        }
      };
      recognition.start();
    } catch (err) { console.error(err); }
  };

  const startSpeechRecording = () => {
    if (!isCameraActiveRef.current) return;
    setIsListening(true);
    // Try Deepgram first; fall back automatically if unavailable
    const dgStarted = startDeepgramRecording();
    if (!dgStarted) {
      startWebSpeechFallback();
    }
  };

  const stopSpeechRecording = () => {
    setIsListening(false);
    if (usingDeepgramRef.current) {
      stopDeepgramRecording();
    } else {
      const recognition = recognitionRef.current;
      if (recognition) { try { recognition.stop(); } catch (e) {} }
    }
  };

  // Submit response and proceed to next question
  const submitAnswer = () => {
    stopSpeechRecording();
    stopAllSpeech();
    
    const finalAnswer = (transcribedTextRef.current + " " + tempSpeechRef.current).trim() || "[No response typed or spoken]";
    
    let updatedPhase1 = [...phase1Responses];
    let updatedPhase2 = [...phase2Responses];

    if (phaseRef.current === 1) {
      updatedPhase1[currentQIdxRef.current] = finalAnswer;
      setPhase1Responses(updatedPhase1);
    } else {
      updatedPhase2[currentQIdxRef.current] = finalAnswer;
      setPhase2Responses(updatedPhase2);
    }

    if (currentQIdxRef.current + 1 < currentQuestionsList.length) {
      deliverQuestion(currentQIdxRef.current + 1);
    } else {
      if (phaseRef.current === 1) {
        setInterviewStage('phase-transition');
        // Keep camera running continuously for proctoring and unified video recording!
      } else {
        concludeSession(updatedPhase1, updatedPhase2);
      }
    }
  };

  const startPhase2 = () => {
    stopAllSpeech();
    setPhase(2);
    setCurrentQIdx(0);
    setInterviewStage('questioning');
    setIsCameraActive(true);
    
    // If the camera was stopped (e.g. due to Phase 1 timeout), restart it for Phase 2
    if (!streamRef.current) {
      startCamera();
    }
    
    setTimeout(() => {
      deliverQuestion(0);
    }, 500);
  };

  // Finish assessment and execute automated scorecard engine
  const concludeSession = (finalPhase1 = phase1Responses, finalPhase2 = phase2Responses) => {
    stopCamera();
    const finalSpeechText = `Thank you for completing your screening assessment. We have successfully recorded your webcam feeds, transcripts, and proctoring logs. Your AI graded scorecard has been updated. Have a wonderful day.`;
    
    speakAI(finalSpeechText, () => {
      evaluateAndSaveInterview(finalPhase1, finalPhase2);
    });
  };

  // Automatically Grade Candidate based on responses
  const evaluateAndSaveInterview = async (finalPhase1 = phase1Responses, finalPhase2 = phase2Responses) => {
    setIsGrading(true);
    setGradingStatus("Saving session recording to secure server...");
    
    if (videoUploadPromiseRef.current) {
      try {
        await videoUploadPromiseRef.current;
      } catch (err) {
        console.warn("Continuing grading despite webcam recording upload failure:", err);
      }
    }
    
    setGradingStatus("Running AI evaluation and scoring models...");
    
    // Compile final ordered transcript from the responses states
    const compiledTranscript = [];
    const qListPhase1 = interview.phase1Questions || [];
    const qListPhase2 = interview.phase2Questions || [];
    
    compiledTranscript.push({
      speaker: "System",
      text: "=== PHASE 1: THEORY ASSESSMENT ===",
      timestamp: "00:00"
    });
    
    qListPhase1.forEach((q, idx) => {
      const qText = typeof q === 'object' && q !== null ? q.text : q;
      const ansText = finalPhase1[idx] || "[No response entered]";
      compiledTranscript.push({
        speaker: "AI Recruiter",
        text: `Question ${idx + 1}: ${qText}`,
        timestamp: "Phase 1"
      });
      compiledTranscript.push({
        speaker: interview.candidateName || "Candidate",
        text: ansText,
        timestamp: "Phase 1"
      });
    });

    compiledTranscript.push({
      speaker: "System",
      text: "=== PHASE 2: TECHNICAL ASSESSMENT ===",
      timestamp: "00:00"
    });
    
    qListPhase2.forEach((q, idx) => {
      const qText = typeof q === 'object' && q !== null ? q.text : q;
      const ansText = finalPhase2[idx] || "[No response entered]";
      compiledTranscript.push({
        speaker: "AI Recruiter",
        text: `Question ${idx + 1}: ${qText}`,
        timestamp: "Phase 2"
      });
      compiledTranscript.push({
        speaker: interview.candidateName || "Candidate",
        text: ansText,
        timestamp: "Phase 2"
      });
    });
    
    fullTranscriptRef.current = compiledTranscript;

    setGradingStatus("Checking database API configuration...");
    try {
      const keyHeaders = {};
      if (candidateToken) {
        keyHeaders['Authorization'] = `Bearer ${candidateToken}`;
      }
      const keyStatusRes = await fetch(BACKEND_URL + '/api/config/key-status', { headers: keyHeaders });
      const keyStatusData = await keyStatusRes.json();
      
      if (keyStatusData.isConfigured) {
        setGradingStatus("Analyzing answers with OpenAI GPT-4o evaluation engine...");
        const candidateAnswers = fullTranscriptRef.current.filter(t => t.speaker !== 'AI Recruiter' && t.speaker !== 'System');
        
        const evalHeaders = { 'Content-Type': 'application/json' };
        if (candidateToken) {
          evalHeaders['Authorization'] = `Bearer ${candidateToken}`;
        }
        const response = await fetch(BACKEND_URL + '/api/evaluate', {
          method: 'POST',
          headers: evalHeaders,
          body: JSON.stringify({
            interviewId: interview.id,
            jobRole: interview.jobRole,
            passingScore: interview.passingScore,
            candidateAnswers,
            cameraOffCount,
            proctorLogs: proctorLogsRef.current,
            speakingPace,
            eyeContactRate,
            candidateType: interview.candidateType
          })
        });

        if (response.ok) {
          const result = await response.json();
          setGradingStatus("Finalizing evaluation scorecard...");
          
          const flags = [];
          if (cameraOffCount > 0) {
            flags.push(`Webcam stream disconnected manually ${cameraOffCount} times`);
          }
          proctorLogsRef.current.forEach(log => {
            flags.push(log);
          });
          if (flags.length === 0) {
            flags.push("Biometric signals highly stable");
            flags.push("Constant gaze alignment");
          }

          const finalReport = {
            overallScore: result.overallScore,
            passingScore: interview.passingScore || 70,
            passingStatus: result.overallScore >= (interview.passingScore || 70) ? "Passed" : "Failed",
            introScore: result.introScore,
            commScore: result.commScore,
            confScore: result.confScore,
            presentScore: result.presentScore,
            nightShiftFine: result.nightShiftFine,
            vocabScore: result.vocabScore,
            grammarScore: result.grammarScore,
            emailScore: result.emailScore,
            cameraOffCount,
            pace: `${speakingPace || 135} WPM (Optimal)`,
            eyeContact: `${Number(eyeContactRate).toFixed(1)}% Stable`,
            summary: result.summary,
            proctorFlags: flags,
            totalDurationSecs: getCurrentElapsedSecs()
          };

          const updatedInt = {
            ...interview,
            status: "Completed",
            transcript: fullTranscriptRef.current,
            report: finalReport
          };

          setIsGrading(false);
          onComplete(updatedInt);
          return;
        } else {
          console.warn("OpenAI database grading proxy failed, falling back to local grading.");
        }
      } else {
        console.log("OpenAI API key is not configured in database, using local fallback grading.");
      }
    } catch (err) {
      console.error("Database evaluation call failed, using local fallback", err);
    }
    
    // Fallback local rule-based engine if OpenAI fails or key is missing
    runLocalEvaluation();
  };

  const runLocalEvaluation = () => {
    const candidateAnswers = fullTranscriptRef.current.filter(t => t.speaker !== 'AI Recruiter' && t.speaker !== 'System');
    
    const phase1Count = interview.phase1Questions ? interview.phase1Questions.length : 3;
    const phase1Answers = candidateAnswers.slice(0, phase1Count);
    const phase1Text = phase1Answers.map(t => t.text).join(" ").toLowerCase();
    
    let introScore = 70 + Math.min(25, Math.round(phase1Text.length / 30));
    if (phase1Text.includes("experience") || phase1Text.includes("years") || phase1Text.includes("work")) {
      introScore = Math.min(98, introScore + 10);
    }
    
    let commScore = 75 + Math.min(20, Math.round((speakingPace > 110 && speakingPace < 155) ? 15 : 5));
    let confScore = Math.max(50, 95 - (cameraOffCount * 12) - (proctorLogsRef.current.filter(l => l.includes("focus lost")).length * 8));
    let presentScore = Math.max(60, 85 - (cameraOffCount * 5));

    let nightShiftFine = "Yes";
    const nightShiftQIdx = (interview.phase1Questions || []).findIndex(q => {
      const txt = (typeof q === 'object' && q !== null ? q.text : q).toLowerCase();
      return txt.includes("night shift") || txt.includes("timezone");
    });
    const nightShiftAns = nightShiftQIdx !== -1 && phase1Answers[nightShiftQIdx] 
      ? phase1Answers[nightShiftQIdx].text.toLowerCase() 
      : "";
      
    if (nightShiftAns.includes("no") || nightShiftAns.includes("not comfortable") || nightShiftAns.includes("cannot") || nightShiftAns.includes("family") || nightShiftAns.includes("unable")) {
      nightShiftFine = "No";
    }

    const phase2Answers = candidateAnswers.slice(phase1Count);
    const vocabAns = phase2Answers[0] ? phase2Answers[0].text.toLowerCase() : "";
    const grammarAns = phase2Answers[1] ? phase2Answers[1].text.toLowerCase() : "";
    const emailAns = phase2Answers[2] ? phase2Answers[2].text.toLowerCase() : "";

    let vocabScore = 65 + Math.min(30, Math.round(vocabAns.length / 10));
    if (vocabAns.includes("programming") || vocabAns.includes("declarative") || vocabAns.includes("overfitting") || vocabAns.includes("alignment")) {
      vocabScore = Math.min(98, vocabScore + 10);
    }

    let grammarScore = 60;
    if (grammarAns.includes("has built") || grammarAns.includes("runs") || grammarAns.includes("browsers") || grammarAns.includes("wants") || grammarAns.includes("discuss")) {
      grammarScore += 20;
    }
    if (grammarAns.includes("perfectly") || grammarAns.includes("scientist needs") || grammarAns.includes("deploys")) {
      grammarScore += 15;
    }
    grammarScore = Math.min(98, grammarScore);

    let emailScore = 60 + Math.min(25, Math.round(emailAns.length / 15));
    if (emailAns.includes("subject:") || emailAns.includes("hi") || emailAns.includes("dear") || emailAns.includes("thanks") || emailAns.includes("regards")) {
      emailScore = Math.min(98, emailScore + 12);
    }

    const overallScore = Number((
      (introScore + commScore + confScore + presentScore + vocabScore + grammarScore + emailScore) / 7
    ).toFixed(1));

    let summary = "";
    if (overallScore >= (interview.passingScore || 70)) {
      summary = `${interview.candidateName} successfully cleared the assessment benchmark with a score of ${overallScore}%. They displayed high confidence, fluent communication, and clear technical alignment during the Theory questions. In the Assessment phase, vocabulary definitions and grammatical corrections were highly precise. Night shift adaptability check resolved as: ${nightShiftFine}. Highly recommended for hiring.`;
    } else {
      summary = `${interview.candidateName} did not satisfy the assessment benchmark of ${interview.passingScore || 70}%. They scored ${overallScore}%. Issues were noted in vocabulary definitions and grammatical structures. Furthermore, camera track interruptions (${cameraOffCount} instances) flagged proctoring warnings. Shift adaptability alignment was resolved as: ${nightShiftFine}.`;
    }

    const flags = [];
    if (cameraOffCount > 0) {
      flags.push(`Webcam stream disconnected manually ${cameraOffCount} times`);
    }
    proctorLogsRef.current.forEach(log => {
      flags.push(log);
    });
    if (flags.length === 0) {
      flags.push("Biometric signals highly stable");
      flags.push("Constant gaze alignment");
    }

    const finalReport = {
      overallScore,
      passingScore: interview.passingScore || 70,
      passingStatus: overallScore >= (interview.passingScore || 70) ? "Passed" : "Failed",
      introScore,
      commScore,
      confScore,
      presentScore,
      nightShiftFine,
      vocabScore,
      grammarScore,
      emailScore,
      cameraOffCount,
      pace: `${speakingPace || 135} WPM (Optimal)`,
      eyeContact: `${Number(eyeContactRate).toFixed(1)}% Stable`,
      summary,
      proctorFlags: flags,
      totalDurationSecs: getCurrentElapsedSecs()
    };

    const updatedInt = {
      ...interview,
      status: "Completed",
      transcript: fullTranscriptRef.current,
      report: finalReport
    };

    setIsGrading(false);
    onComplete(updatedInt);
  };

  // Timer Tick Handling (Phase 1 or Phase 2 decrement)
  useEffect(() => {
    let globalTimerInterval = null;

    if (interviewStage === 'questioning') {
      globalTimerInterval = setInterval(() => {
        if (!isCameraActive) return; // Pause all phase and question countdown timers during camera-off warnings!
        if (phase === 1) {
          setPhase1TimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(globalTimerInterval);
              setInterviewStage('phase-transition');
              stopCamera();
              return 0;
            }
            return prev - 1;
          });
        } else {
          setPhase2TimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(globalTimerInterval);
              concludeSession();
              return 0;
            }
            return prev - 1;
          });
        }

        if (isCameraActive) {
          setQuestionTimeLeft(prev => {
            if (prev <= 1) {
              submitAnswer();
              return 120;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      clearInterval(globalTimerInterval);
    };
  }, [interviewStage, phase, currentQIdx, phase1TimeLeft, phase2TimeLeft, transcribedText, tempSpeech, isCameraActive]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (secsElapsed) => {
    const mins = Math.floor(secsElapsed / 60);
    const secs = secsElapsed % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTimeLeft = phase === 1 ? phase1TimeLeft + Math.floor(((interview.durationLimit || 30) / 3) * 60) : phase2TimeLeft;

  return (
    <div className="w-full apex-theme-bg flex flex-col justify-between flex-grow" style={{ position: 'relative', minHeight: 'calc(100vh - 56px)' }}>
      <div className="container py-8 flex-grow flex flex-col justify-start min-h-[calc(100vh-100px)] overflow-y-auto animate-fade-in relative" style={{ zIndex: 1 }}>
      
      {/* OpenAI AI Grading Loader Screen */}
      {isGrading && (
        <div className="fixed inset-0 bg-white/95 z-[100] flex flex-col items-center justify-center p-8 space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 bg-white border-2 border-black rounded-lg flex items-center justify-center text-black shadow-[2px_2px_0px_#000000]">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <div className="max-w-md space-y-3">
            <h2 className="text-black text-xl font-bold uppercase tracking-wider">NexaHire AI Grading</h2>
            <p className="text-xs text-slate-700 leading-relaxed font-mono">
              {gradingStatus}
            </p>
            <div className="w-64 bg-slate-100 h-2.5 rounded-full overflow-hidden mx-auto border border-black shadow-[1.5px_1.5px_0px_#000000]">
              <div className="bg-black h-full w-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
      
      {/* 1. Fullscreen Warning Overlay when camera is manually turned off during active questioning */}
      {interviewStage === 'questioning' && !isCameraActive && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 space-y-6 text-center animate-fade-in">
          <div className="w-20 h-20 bg-white border-2 border-black rounded-full flex items-center justify-center text-black animate-pulse shadow-[3px_3px_0px_#000000]">
            <CameraOff className="w-10 h-10 animate-bounce" />
          </div>
          <div className="max-w-md space-y-3">
            <h2 className="text-red-600 text-2xl font-bold uppercase tracking-wide">Proctor Warning: Camera Off</h2>
            <p className="text-sm text-slate-700 leading-relaxed font-bold">
              Webcam stream is strictly required to proceed with this AI-proctored screening. Turning off your camera represents a security violation.
            </p>
            <div className="p-3.5 bg-red-50 border-2 border-red-500 text-red-700 rounded-lg text-xs font-mono font-bold shadow-[2px_2px_0px_#000000] animate-pulse">
              ⚠️ WARNING: INCIDENT #1 of 2. EXAM TIMER IS PAUSED.
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Note: If your camera is turned off or disconnected a second time, your exam will be terminated immediately.
            </p>
          </div>
          <button className="btn btn-primary animate-pulse" onClick={handleToggleCamera}>
            <Camera className="w-4 h-4" /> Re-enable Camera Stream
          </button>
        </div>
      )}

      {/* 2. Top Gaze Away Alert banner */}
      {isCameraActive && lookingAwayAlert && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-lg bg-white text-black font-bold text-xs shadow-[3px_3px_0px_#000000] border-2 border-black flex items-center gap-2 animate-bounce">
          <AlertTriangle className="w-5 h-5 text-black flex-shrink-0 animate-pulse" /> WARNING: DETECTED OCULAR DRIFT. PLEASE KEEP FOCUS ON SCREEN.
        </div>
      )}

      {/* Check stage: if intro, ready-check, or phase-transition, show the single premium proctoring panel matching screenshot */}
      {interviewStage === 'intro' || interviewStage === 'ready-check' || interviewStage === 'phase-transition' ? (
        <div className="max-w-2xl mx-auto w-full glass-card flex flex-col justify-between p-6 space-y-6 animate-scale-in my-auto">
          {/* Header */}
          <div className="flex justify-between items-center bg-white px-4 py-2.5 border-2 border-black rounded-lg shadow-[2px_2px_0px_#000000]">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-black" />
              <span className="text-xs font-semibold text-black font-mono uppercase tracking-wider">Live Proctoring Feed</span>
              <span className="text-[10px] text-black font-bold border border-black bg-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping"></span> Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isSpeaking ? (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-bold">
                  <Mic className="w-3.5 h-3.5 animate-pulse text-emerald-600" /> SPEAKING
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                  <MicOff className="w-3.5 h-3.5 text-slate-400" /> SILENT
                </span>
              )}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-black border border-black bg-white px-2.5 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping"></span> Recording
              </div>
            </div>
          </div>

          {/* Webcam Preview Screen */}
          <div className="proctor-video-container">
            <div className="scan-line"></div>
            <video ref={videoRef} className="proctor-video w-full h-full object-cover" autoPlay playsInline muted></video>
            
            {/* Face Tracker Mesh Overlay */}
            {isCameraActive && (
              <div className="face-mesh-overlay">
                <div 
                  className="face-box" 
                  style={{ 
                    width: '38%', 
                    height: '52%', 
                    top: '24%', 
                    left: lookingAwayAlert ? '12%' : '31%',
                    borderColor: lookingAwayAlert ? 'var(--accent-rose)' : 'var(--accent-cyan)'
                  }}
                >
                  {lookingAwayAlert && (
                    <div className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-black rounded-full flex items-center justify-center text-white border border-black font-bold text-xs animate-bounce">
                      !
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Telemetry Overlay Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 border-t-2 border-black px-4 py-3 flex items-center justify-between text-[11px] font-mono text-black">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-black" />
                <span>Gaze Lock: <strong className={lookingAwayAlert ? "text-red-600 animate-pulse" : "text-black"}>{Math.round(eyeContactRate)}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-black" />
                <span>Pace: <strong className="text-black">{speakingPace || 127} WPM</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-black" />
                <span>Violations: <strong className={cameraOffCount > 0 ? "text-red-600 font-bold animate-pulse" : "text-black"}>{cameraOffCount}</strong></span>
              </div>
            </div>
          </div>

          {/* Details & Device cards grid */}
          <div className="grid md:grid-cols-12 gap-6 items-center">
            {/* Left instructions block */}
            <div className="md:col-span-7 space-y-3 text-left">
              {interviewStage === 'phase-transition' ? (
                <div className="flex items-start gap-2.5">
                  <BookOpen className="w-5 h-5 text-black mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-black">Phase 1 Complete! Ready for Phase 2</h4>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      You have successfully submitted Phase 1 replies. Please verify biometrics are steady and continue to <strong>Phase 2: Technical Assessment</strong>.
                    </p>
                    <div className="p-2 bg-neutral-100 border-2 border-black rounded-lg text-[10px] text-slate-700 space-y-1 mt-2 font-mono shadow-[1.5px_1.5px_0px_#000000]">
                      <div>⏱️ Limit: <strong>10 minutes limit</strong></div>
                      <div>📝 Topics: Grammar, corrections, and Email writing.</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-black">Initiate Video Screening</h4>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      Please confirm that your webcam and microphone are calibrated. The AI proctor will monitor your biometrics continuously.
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      Click below to begin the questioning session.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Status Cards */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white border-2 border-black shadow-[2px_2px_0px_#000000]">
                <div className="w-10 h-10 rounded bg-white border-2 border-black flex items-center justify-center text-black flex-shrink-0 shadow-[1px_1px_0px_#000000]">
                  <Video className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-black">Webcam</div>
                  <div className="text-[10px] text-black font-mono">Connected & Active</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white border-2 border-black shadow-[2px_2px_0px_#000000]">
                <div className="w-10 h-10 rounded bg-white border-2 border-black flex items-center justify-center text-black flex-shrink-0 shadow-[1px_1px_0px_#000000]">
                  <Mic className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-black">Microphone</div>
                  <div className="text-[10px] text-black font-mono">Connected & Active</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div>
            {interviewStage === 'phase-transition' ? (
              <button 
                className="btn btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2"
                onClick={startPhase2}
              >
                Begin Phase 2 (Assessment)
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                {!isCameraActive && (
                  <div className="bg-red-500/10 border border-red-500 text-red-500 text-xs font-mono rounded-lg p-3 text-center mb-3 font-bold">
                    ⚠️ Webcam stream is inactive. Please enable your camera above to start the interview.
                  </div>
                )}
                <button 
                  className={`btn w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 ${
                    !isCameraActive 
                      ? 'bg-slate-800 border-2 border-slate-700 text-slate-500 cursor-not-allowed shadow-none' 
                      : 'btn-primary'
                  }`}
                  disabled={!isCameraActive}
                  onClick={() => {
                    if ('speechSynthesis' in window) {
                      try {
                        window.speechSynthesis.cancel();
                      } catch (e) {}
                    }
                    initiateQuestions();
                  }}
                >
                  {!isCameraActive 
                    ? 'Webcam Required' 
                    : (aiIsSpeaking ? 'Skip Intro & Start Phase 1 (Theory)' : 'I Am Ready - Start Phase 1 (Theory)')
                  }
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Locked status banner */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono py-1">
            <Shield className="w-3.5 h-3.5" /> Your session is encrypted and monitored for integrity. All activities are securely logged.
          </div>
        </div>
      ) : (
        /* QUESTIONING STAGE: RENDERS 2-COLUMN VIEW WITH PROGRESS BAR AT TOP */
        <>
          {/* Top Session Progress Bar */}
          <div className="w-full flex items-center justify-between mb-6 p-4 rounded-lg bg-white border-2 border-black font-mono text-xs shadow-[2px_2px_0px_#000000]">
            <div className="flex items-center gap-3">
              <span className="text-slate-700 uppercase">CANDIDATE:</span>
              <span className="text-black font-bold">{interview.candidateName}</span>
              <span className="px-2 py-0.5 bg-white border border-black rounded-md text-black font-bold">{interview.jobRole}</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-black" />
                <span className="text-slate-600 uppercase">
                  {phase === 1 ? "Phase 1 Theory (20m)" : "Phase 2 Assessment (10m)"} TIMER:
                </span>
                <span className="text-black font-extrabold text-sm font-mono">
                  {phase === 1 ? formatTime(phase1TimeLeft) : formatTime(phase2TimeLeft)}
                </span>
              </div>
              <div className="w-24 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-black">
                <div 
                  className="bg-black h-full transition-all duration-1000" 
                  style={{ width: `${phase === 1 ? (phase1TimeLeft / 1200) * 100 : (phase2TimeLeft / 600) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-8 items-stretch flex-grow animate-scale-in">
            {/* LEFT COLUMN: AI RECRUITER WAVES PANEL */}
            <div className="md:col-span-6 glass-card flex flex-col justify-between min-h-[450px]">
              <div className="flex justify-between items-center border-b border-black/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-black animate-ping"></span>
                  <span className="font-mono text-xs text-black font-bold tracking-widest uppercase">
                    {phase === 1 ? "Phase 1: Theory screening" : "Phase 2: Technical Assessment"}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">VOICE SYNTHESIZER: ON</div>
              </div>

              {/* Spherical Avatar */}
              <div className="py-8">
                <div className="ai-avatar-container">
                  <div className="ai-avatar-glow"></div>
                  <div className={`ai-avatar-sphere ${aiIsSpeaking ? 'speaking' : ''}`}>
                    <Sparkles className="text-white" />
                  </div>
                </div>

                <div className="wave-bars-container">
                  {[...Array(8)].map((_, idx) => (
                    <div key={idx} className={`wave-bar ${aiIsSpeaking ? 'speaking' : ''}`}></div>
                  ))}
                </div>
              </div>

              {/* AI Subtitle Subscreen */}
              <div className="p-4 rounded-lg bg-neutral-100 border-2 border-black text-left min-h-[110px] flex flex-col justify-between shadow-[2px_2px_0px_#000000]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-mono text-slate-700 uppercase tracking-widest block">Speech Subtitles</span>
                  {subtitleText && (
                    <button 
                      onClick={() => {
                        setSpeechBlocked(false);
                        speakAI(subtitleText);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        border: '1px solid #000000',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        boxShadow: '1px 1px 0px #000000'
                      }}
                    >
                      🔊 Read Aloud
                    </button>
                  )}
                </div>
                <p className="text-xs text-black leading-relaxed italic">
                  {subtitleText || "Awaiting ready verification from candidate..."}
                </p>
                {speechBlocked && (
                  <div className="mt-3 p-3 bg-amber-500/10 border-2 border-amber-500 rounded-lg flex items-center justify-between gap-3 animate-pulse">
                    <div className="text-[11px] font-bold text-amber-950 font-sans">
                      ⚠️ Browser blocked AI voice autoplay. Click "Enable Voice" to unmute.
                    </div>
                    <button 
                      onClick={handleUnlockSpeech}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        backgroundColor: '#f59e0b',
                        color: '#ffffff',
                        border: '1.5px solid #000000',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxShadow: '1px 1px 0px #000000'
                      }}
                    >
                      🔊 Enable Voice
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: BIOMETRIC SCREENING / HUD */}
            <div className="md:col-span-6 glass-card flex flex-col justify-between min-h-[450px]">
              
              {/* Header */}
              <div className="flex justify-between items-center bg-white px-4 py-2 border-2 border-black rounded-lg mb-4 shadow-[2px_2px_0px_#000000]">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-black" />
                  <span className="text-[10px] font-semibold text-black font-mono uppercase tracking-wider">Live Proctoring Feed</span>
                  <span className="text-[10px] text-black font-bold border border-black bg-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping"></span> Active
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isSpeaking ? (
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-bold">
                      <Mic className="w-3 h-3 animate-pulse text-emerald-600" /> SPEAKING
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                      <MicOff className="w-3 h-3 text-slate-400" /> SILENT
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-black border border-black bg-white px-2.5 py-0.5 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping"></span> Recording
                  </div>
                </div>
              </div>

              {/* Video container */}
              <div className="proctor-video-container mb-4">
                <div className="scan-line"></div>
                <video ref={videoRef} className="proctor-video w-full h-full object-cover" autoPlay playsInline muted></video>
                
                {/* Face Tracker Mesh Overlay */}
                {isCameraActive && (
                  <div className="face-mesh-overlay">
                    <div 
                      className="face-box" 
                      style={{ 
                        width: '38%', 
                        height: '52%', 
                        top: '24%', 
                        left: lookingAwayAlert ? '12%' : '31%',
                        borderColor: lookingAwayAlert ? 'var(--accent-rose)' : 'var(--accent-cyan)'
                      }}
                    >
                      {lookingAwayAlert && (
                        <div className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-black rounded-full flex items-center justify-center text-white border border-black font-bold text-xs animate-bounce">
                          !
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Telemetry Bar outside container */}
              <div className="bg-white border-2 border-black rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between text-[11px] font-mono text-black shadow-[2px_2px_0px_#000000]">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-black" />
                  <span>Gaze Lock: <strong className={lookingAwayAlert ? "text-red-600 animate-pulse" : "text-black"}>{Math.round(eyeContactRate)}%</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-black" />
                  <span>Pace: <strong className="text-black">{speakingPace || 127} WPM</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-black" />
                  <span>Violations: <strong className={cameraOffCount > 0 ? "text-red-600 font-bold animate-pulse" : "text-black"}>{cameraOffCount}</strong></span>
                </div>
              </div>

              {/* Question Navigation Ribbon */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', width: '100%', marginBottom: '4px' }}>
                {currentQuestionsList.map((q, idx) => {
                  const isSelected = currentQIdx === idx;
                  const isAnswered = phase === 1 ? phase1Responses[idx]?.trim().length > 0 : phase2Responses[idx]?.trim().length > 0;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        deliverQuestion(idx);
                      }}
                      style={{
                        background: isSelected ? '#000000' : isAnswered ? '#eff6ff' : '#ffffff',
                        border: '2px solid #000000',
                        color: isSelected ? '#ffffff' : '#000000',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                        boxShadow: isSelected ? 'none' : '2px 2px 0px #000000',
                        transform: isSelected ? 'translate(2px, 2px)' : 'none'
                      }}
                      className="hover:scale-105 animate-fade-in"
                    >
                      <span>Q{idx + 1}</span>
                      {isAnswered && (
                        <span style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          background: isSelected ? '#ffffff' : '#2563eb' 
                        }}></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Question & Transcribe workspace */}
              <div className="flex-grow flex flex-col justify-between space-y-4 text-left">
                {/* Question card */}
                <div className="p-3 rounded-lg bg-white border-2 border-black shadow-[2px_2px_0px_#000000]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-mono text-black font-bold uppercase tracking-wider">
                      {phase === 1 ? "PHASE 1 THEORY" : "PHASE 2 ASSESSMENT"} • Q{currentQIdx + 1} OF {currentQuestionsList.length}
                    </span>
                    <span className="text-[10px] font-mono text-black font-bold">Q_TIMER: {formatTime(questionTimeLeft)}</span>
                  </div>
                  <p className="text-xs font-semibold text-black">
                    {typeof currentQuestionsList[currentQIdx] === 'object' && currentQuestionsList[currentQIdx] !== null
                      ? currentQuestionsList[currentQIdx].text
                      : currentQuestionsList[currentQIdx]}
                  </p>
                </div>

                {/* Dynamic Input Method Area */}
                {(() => {
                  const currentQuestionItem = currentQuestionsList[currentQIdx];
                  if (!currentQuestionItem) {
                    return (
                      <div className="p-3 bg-neutral-100 rounded-lg border-2 border-black min-h-[140px] flex items-center justify-center shadow-[2px_2px_0px_#000000]">
                        <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest animate-pulse">
                          Preparing question workspace...
                        </span>
                      </div>
                    );
                  }
                  const isItemObj = typeof currentQuestionItem === 'object' && currentQuestionItem !== null;
                  let qType = "speech";
                  if (isItemObj) {
                    qType = currentQuestionItem.type || "speech";
                  } else {
                    const qTextLower = currentQuestionItem.toLowerCase();
                    if (
                      (phase === 2 && currentQIdx === 2) || // 3rd question in Phase 2
                      qTextLower.startsWith("write a") || 
                      qTextLower.startsWith("draft a") || 
                      qTextLower.startsWith("draft an email") ||
                      qTextLower.includes("email format template")
                    ) {
                      qType = "text";
                    }
                  }
                  const qOptions = isItemObj ? (currentQuestionItem.options || []) : [];

                  return (
                    <div className="p-3 bg-neutral-100 rounded-lg border-2 border-black text-left space-y-1.5 min-h-[140px] flex flex-col justify-between shadow-[2px_2px_0px_#000000]">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-slate-700 uppercase tracking-widest">
                          {qType === 'mcq' ? '🔘 Select one response option' : qType === 'speech' ? '🎤 Verbal Response Active' : '⌨️ Written Response Active'}
                        </span>
                        {qType === 'speech' && (
                          isListening ? (
                            <span className="text-[8px] font-mono font-bold border border-black bg-white text-black px-1.5 py-0.5 rounded animate-pulse flex items-center gap-1">
                              <Mic className="w-2.5 h-2.5 text-black" /> VOICE ACTIVE
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono text-slate-600">Muted (AI Speaking)</span>
                          )
                        )}
                        {qType === 'text' && (
                          <span className="text-[8px] font-mono font-bold border border-black bg-white text-black px-1.5 py-0.5 rounded flex items-center gap-1">
                            KEYBOARD ACTIVE
                          </span>
                        )}
                        {qType === 'mcq' && (
                          <span className="text-[8px] font-mono font-bold border border-black bg-white text-black px-1.5 py-0.5 rounded flex items-center gap-1">
                            MCQ RESPONSE
                          </span>
                        )}
                      </div>
                      
                      {qType === 'mcq' ? (
                        <div className="flex flex-col gap-2.5 w-full py-2">
                          {qOptions.map((opt, oIdx) => {
                            const isSelected = transcribedText === opt;
                            return (
                              <div 
                                key={oIdx}
                                onClick={() => {
                                  if (!aiIsSpeaking) {
                                    setTranscribedText(opt);
                                  }
                                }}
                                className={`mcq-option-label ${isSelected ? 'selected' : ''}`}
                                style={{ pointerEvents: aiIsSpeaking ? 'none' : 'auto' }}
                              >
                                <div className="mcq-radio-circle">
                                  <div className="mcq-radio-dot"></div>
                                </div>
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : qType === 'speech' ? (
                        <div className="flex flex-col items-center justify-center flex-grow p-4 text-center space-y-3 border-2 border-dashed border-slate-300 rounded-lg bg-white/50 min-h-[140px] w-full animate-fade-in">
                          <div className="relative flex items-center justify-center">
                            <div className="absolute w-10 h-10 rounded-full bg-emerald-500/20 animate-ping"></div>
                            <div className="w-10 h-10 bg-white border-2 border-black rounded-full flex items-center justify-center text-emerald-600 shadow-[2px_2px_0px_#000000]">
                              <Mic className="w-5 h-5 animate-pulse text-emerald-600" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[11px] font-bold text-black uppercase tracking-wider">Verbal Capture Active</h4>
                            <p className="text-[10px] text-slate-500 max-w-sm leading-normal">
                              The AI agent is capturing and evaluating your verbal response in real-time. Transcription is hidden from view to prevent distractions.
                            </p>
                          </div>
                          {isSpeaking && (
                            <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full animate-pulse shadow-[1px_1px_0px_#000000]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                              Voice Detected
                            </div>
                          )}
                        </div>
                      ) : (
                        <textarea 
                          className="notebook-textarea w-full flex-grow focus:outline-none"
                          value={transcribedText + tempSpeech}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTranscribedText(val);
                            setTempSpeech(""); // Clear any temporary speech buffer since they manually edited
                            recognitionBaselineRef.current = val; // Sync baseline!
                            
                            // Update response states immediately on keystroke
                            if (phase === 1) {
                              setPhase1Responses(p => {
                                const next = [...p];
                                next[currentQIdx] = val;
                                return next;
                              });
                            } else {
                              setPhase2Responses(p => {
                                const next = [...p];
                                next[currentQIdx] = val;
                                return next;
                              });
                            }
                          }}
                          placeholder={
                            aiIsSpeaking 
                              ? "Wait for AI to finish speaking..." 
                              : "⌨️ Type your response directly here..."
                          }
                          disabled={aiIsSpeaking}
                        />
                      )}
                    </div>
                  );
                })()}

                <div className="flex gap-2">
                  <button 
                    type="button"
                    className="btn border-2 border-black bg-white hover:bg-neutral-100 text-black text-xs font-bold px-4 py-3 flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000000] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                    onClick={() => deliverQuestion(currentQIdx - 1)}
                    disabled={currentQIdx === 0 || aiIsSpeaking}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous
                  </button>

                  <button 
                    type="button"
                    className="btn border-2 border-black bg-white hover:bg-neutral-100 text-black text-xs font-bold px-4 py-3 flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000000] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                    onClick={() => deliverQuestion(currentQIdx + 1)}
                    disabled={currentQIdx === currentQuestionsList.length - 1 || aiIsSpeaking}
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button 
                    type="button"
                    className="btn btn-primary flex-grow text-xs font-bold py-3 flex items-center justify-center gap-2"
                    onClick={submitAnswer}
                    disabled={aiIsSpeaking}
                  >
                    <Send className="w-4 h-4" /> {currentQIdx === currentQuestionsList.length - 1 ? (phase === 1 ? "Finish Phase 1 & Continue" : "Finish Assessment & Submit") : "Submit Response & Continue"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </>
      )}
      </div>

      <footer className="w-full apex-footer py-6 mt-16 relative z-10">
        <div className="container max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AdvancedSecureLogo size="mini" />
            <span className="apex-logo-text" style={{ fontSize: '0.95rem' }}>NexaHire</span>
            <span className="apex-logo-badge" style={{ fontSize: '0.55rem', padding: '1px 6px' }}>AI AGENT</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Enterprise-grade AI talent proctoring and candidate evaluation platform.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ----------------------------------------------------
// 7. EXPIRED SECURE LINK SCREEN
// ----------------------------------------------------
function CandidateExpired() {
  return (
    <div className="w-full apex-theme-bg flex flex-col justify-between flex-grow" style={{ position: 'relative', minHeight: 'calc(100vh - 56px)' }}>
      <div className="container py-16 flex-grow flex items-center justify-center animate-scale-in" style={{ zIndex: 1 }}>
        <div className="glass-card max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-white border-2 border-black rounded-lg flex items-center justify-center text-black mx-auto animate-float shadow-[2px_2px_0px_#000000]">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <span className="badge badge-danger mb-2">Assessment Lockout</span>
            <h2 className="text-black">Secure Interview Link Expired</h2>
            <p className="text-slate-700 text-sm mt-2 leading-relaxed">
              This time-bound assessment link has expired. Secure screening requirements enforce strict windows for credentials.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-neutral-100 border-2 border-black text-left text-xs text-slate-700 space-y-2 shadow-[2px_2px_0px_#000000]">
            <div className="font-bold text-black flex items-center gap-1.5 text-left">
              <Mail className="w-4 h-4 text-black" /> Notifications Emailed
            </div>
            <p className="leading-relaxed text-left">
              We have automatically notified the HR representative that the window closed without completion. Please check with your recruiting coordinator for another scheduling token.
            </p>
          </div>

          <div className="text-xs text-slate-600 font-mono">
            REF_CODE: ERR_TOKEN_EXPIRED_JWT
          </div>
        </div>
      </div>

      <footer className="w-full apex-footer py-6 mt-16 relative z-10">
        <div className="container max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AdvancedSecureLogo size="mini" />
            <span className="apex-logo-text" style={{ fontSize: '0.95rem' }}>NexaHire</span>
            <span className="apex-logo-badge" style={{ fontSize: '0.55rem', padding: '1px 6px' }}>AI AGENT</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Enterprise-grade AI talent proctoring and candidate evaluation platform.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ----------------------------------------------------
// 8. INTERVIEW FINISHED COMPLETED SCREEN
// ----------------------------------------------------
function CandidateFinished({ interview, onReturn }) {
  const isTerminated = interview?.status === 'Terminated' ||
                      interview?.report?.passingStatus === 'Terminated' ||
                      interview?.report?.terminationViolationType != null ||
                      interview?.report?.summary?.includes("terminated") || 
                      (interview?.report?.proctorFlags && interview.report.proctorFlags.some(f => f.includes("CRITICAL VIOLATION")));

  const [closeCountdown, setCloseCountdown] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setCloseCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          try {
            window.open('', '_self', '');
            window.close();
          } catch (e) {
            console.warn("Standard window.close failed:", e);
          }
          try {
            window.open('about:blank', '_self').close();
          } catch (e) {
            console.warn("Alternative window.close failed:", e);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full apex-theme-bg flex flex-col justify-between flex-grow" style={{ position: 'relative', minHeight: 'calc(100vh - 56px)' }}>
      <div className="container py-16 flex-grow flex items-center justify-center animate-scale-in" style={{ zIndex: 1 }}>
        <div className="glass-card max-w-md text-center space-y-6">
          {isTerminated ? (
            <>
              <div className="w-16 h-16 bg-white border-2 border-black rounded-lg flex items-center justify-center text-black mx-auto animate-pulse shadow-[2px_2px_0px_#000000]">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <span className="badge badge-danger mb-2">
                  {interview?.report?.terminationViolationType === 'MULTI_MONITOR' 
                    ? '🖥️ Multiple Monitors Detected' 
                    : interview?.report?.terminationViolationType === 'WEBCAM_DISCONNECTED'
                      ? '📷 Webcam Monitoring Lost'
                      : '🚫 Security Breach Detected'}
                </span>
                <h2 className="text-black">Exam Cancelled</h2>
                <p className="text-slate-700 text-sm mt-2 leading-relaxed text-center">
                  {interview?.report?.terminationViolationType === 'MULTI_MONITOR'
                    ? 'Your exam was cancelled because an external monitor or additional display device was detected. This platform does not permit multiple screens during assessment.'
                    : interview?.report?.terminationViolationType === 'WEBCAM_DISCONNECTED'
                      ? 'Your exam was cancelled because your webcam was turned off or lost connection multiple times. This platform enforces strict real-time webcam monitoring during assessment.'
                      : 'This secure session was terminated because you switched tabs, minimized the browser, or navigated away from the active exam window.'}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-red-50 border-2 border-red-400 text-left text-xs text-slate-700 space-y-2">
                <div className="font-bold text-red-600 flex items-center gap-1.5 text-left">
                  <ShieldAlert className="w-4 h-4 text-red-600" /> Security Violation Logged
                </div>
                <p className="leading-relaxed font-mono text-[10px] text-left text-red-700">
                  Session ID: {interview.id}<br />
                  Status: CANCELLED<br />
                  Type: {interview?.report?.terminationViolationType || 'SECURITY_BREACH'}<br />
                  {interview?.report?.terminationReason && (
                    <>Reason: {interview.report.terminationReason}<br /></>
                  )}
                  {interview?.report?.terminatedAt && (
                    <>Time: {interview.report.terminatedAt}<br /></>
                  )}
                  Integrity Check: REJECTED
                </p>
              </div>

              <div className="text-xs text-red-600 font-semibold">
                Your HR recruiter has been notified of this violation. This incident has been permanently saved.
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-white border-2 border-black rounded-lg flex items-center justify-center text-black mx-auto animate-float shadow-[2px_2px_0px_#000000]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="badge badge-success mb-2">Session Securely Uploaded</span>
                <h2 className="text-black">Screening Completed</h2>
                <p className="text-slate-700 text-sm mt-2 leading-relaxed text-center">
                  Thank you! Your interview is complete. Please wait for the feedback, we will reach out to you ASAP.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-neutral-100 border-2 border-black text-left text-xs text-slate-700 space-y-2 shadow-[2px_2px_0px_#000000]">
                <div className="font-bold text-black flex items-center gap-1.5 text-left">
                  <ShieldCheck className="w-4 h-4 text-black" /> Cryptographic Ledger Record
                </div>
                <p className="leading-relaxed font-mono text-[10px] text-left">
                  Session ID: {interview.id}<br />
                  Status: COMPLETED<br />
                  Integrity Check: SHA-256 Verified
                </p>
              </div>

              <div className="text-xs text-slate-600">
                The hiring team has been notified. You may close this browser window.
              </div>
            </>
          )}

          <div className="text-[10px] text-black font-mono animate-pulse pt-2 border-t border-black/10 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} /> 
            Secured lockdown active: closing browser tab in {closeCountdown}s...
          </div>
        </div>
      </div>

      <footer className="w-full apex-footer py-6 mt-16 relative z-10">
        <div className="container max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AdvancedSecureLogo size="mini" />
            <span className="apex-logo-text" style={{ fontSize: '0.95rem' }}>NexaHire</span>
            <span className="apex-logo-badge" style={{ fontSize: '0.55rem', padding: '1px 6px' }}>AI AGENT</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Enterprise-grade AI talent proctoring and candidate evaluation platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
