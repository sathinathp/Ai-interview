const http = require('http');

const REGISTRATION_KEY = 'SoftStandard@HR2024';
const candidateInfo = {
  interviewId: 'int-s75aibm6a',
  passcode: '924923',
  candidateName: 'sathinath padhi',
  candidateEmail: 'sathinath123@gmail.com'
};

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING AI INTERVIEW SECURITY AUTHENTICATION TEST SUITE ---');

  // Test 1: Accessing interviews without HR token
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/interviews',
      method: 'GET'
    });
    console.log('Test 1 (Unauthorized HR CRUD): Status code is', res.statusCode, ' (Expected: 401)');
    if (res.statusCode !== 401) throw new Error('Test 1 failed!');
  } catch (e) {
    console.error('Test 1 Error:', e.message);
    process.exit(1);
  }

  // Test 2: Register HR Admin
  let hrToken = '';
  const hrEmail = 'test.hr.' + Math.random().toString(36).substring(7) + '@softstandard.com';
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/hr/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: hrEmail,
      password: 'testSecurePassword123',
      registrationKey: REGISTRATION_KEY
    });
    console.log('Test 2 (HR Registration): Status code is', res.statusCode, ' (Expected: 201/200)');
    if (res.statusCode !== 201 && res.statusCode !== 200) throw new Error('Test 2 failed!');
    hrToken = res.body.token;
    console.log('HR JWT token retrieved successfully.');
  } catch (e) {
    console.error('Test 2 Error:', e.message);
    process.exit(1);
  }

  // Test 3: Log in HR Admin
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/hr/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: hrEmail,
      password: 'testSecurePassword123'
    });
    console.log('Test 3 (HR Login): Status code is', res.statusCode, ' (Expected: 200)');
    if (res.statusCode !== 200) throw new Error('Test 3 failed!');
  } catch (e) {
    console.error('Test 3 Error:', e.message);
    process.exit(1);
  }

  // Test 4: Access interviews WITH HR Token
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/interviews',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${hrToken}`
      }
    });
    console.log('Test 4 (Authorized HR CRUD): Status code is', res.statusCode, ' (Expected: 200)');
    if (res.statusCode !== 200) throw new Error('Test 4 failed!');
    console.log('Successfully fetched interviews using HR JWT token.');
  } catch (e) {
    console.error('Test 4 Error:', e.message);
    process.exit(1);
  }

  // Test 5: Fetch candidate public metadata (no auth required)
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/interviews/${candidateInfo.interviewId}/public`,
      method: 'GET'
    });
    console.log('Test 5 (Public Metadata): Status code is', res.statusCode, ' (Expected: 200)');
    if (res.statusCode !== 200) throw new Error('Test 5 failed!');
    console.log('Public metadata details jobRole:', res.body.jobRole);
    if (res.body.passcode || res.body.report) {
      throw new Error('Security Leak! Passcode or Report exposed in public endpoint!');
    }
    console.log('Public metadata is clean (no sensitive passcode/report leak detected).');
  } catch (e) {
    console.error('Test 5 Error:', e.message);
    process.exit(1);
  }

  // Test 6: Log in candidate (obtain candidate JWT token)
  let candidateToken = '';
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/candidate/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      interviewId: candidateInfo.interviewId,
      passcode: candidateInfo.passcode,
      candidateName: candidateInfo.candidateName,
      candidateEmail: candidateInfo.candidateEmail
    });
    console.log('Test 6 (Candidate Login): Status code is', res.statusCode, ' (Expected: 200)');
    if (res.statusCode !== 200) throw new Error('Test 6 failed!');
    candidateToken = res.body.token;
    console.log('Candidate JWT token retrieved successfully.');
  } catch (e) {
    console.error('Test 6 Error:', e.message);
    process.exit(1);
  }

  // Test 7: Access candidate session with candidate token
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/interviews/${candidateInfo.interviewId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${candidateToken}`
      }
    });
    console.log('Test 7 (Authorized Candidate Access): Status code is', res.statusCode, ' (Expected: 200)');
    if (res.statusCode !== 200) throw new Error('Test 7 failed!');
    console.log('Successfully fetched detailed interview state using candidate JWT token.');
  } catch (e) {
    console.error('Test 7 Error:', e.message);
    process.exit(1);
  }

  console.log('--- ALL AUTHENTICATION SECURITY INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests();
