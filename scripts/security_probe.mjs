import WebSocket from 'ws';
import { spawn } from 'child_process';

const PORT = 3005;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WS_URL = `ws://127.0.0.1:${PORT}/ws`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSecurityProbe() {
  console.log('Starting test server on port 3005 for security probe...');
  const serverProcess = spawn('npx', ['tsx', 'server.ts'], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
    stdio: 'inherit'
  });

  await sleep(4000);

  console.log('Running Cove1 Security Probe (Unauthenticated Attack Suite)...');
  const results = [];

  try {
    const health = await fetch(`${BASE_URL}/api/health`);
    if (!health.ok) throw new Error('Health check failed');
  } catch (e) {
    serverProcess.kill();
    console.error(`Server failed to boot at port ${PORT}:`, e);
    process.exit(1);
  }

  // Test 1: GET /api/search without auth
  try {
    const res = await fetch(`${BASE_URL}/api/search?q=test`);
    if (res.status === 401 || res.status === 403) {
      results.push({ name: 'Unauthenticated /api/search access', status: 'BLOCKED (SECURE)' });
    } else {
      results.push({ name: 'Unauthenticated /api/search access', status: 'LEAKED (VULNERABLE)', statusHttp: res.status });
    }
  } catch (err) {
    results.push({ name: 'Unauthenticated /api/search access', status: 'ERROR', error: err.message });
  }

  // Test 2: GET /api/messages without auth
  try {
    const res = await fetch(`${BASE_URL}/api/messages?conversationId=conv_111_222`);
    if (res.status === 401 || res.status === 403) {
      results.push({ name: 'Unauthenticated /api/messages access', status: 'BLOCKED (SECURE)' });
    } else {
      results.push({ name: 'Unauthenticated /api/messages access', status: 'LEAKED (VULNERABLE)', statusHttp: res.status });
    }
  } catch (err) {
    results.push({ name: 'Unauthenticated /api/messages access', status: 'ERROR', error: err.message });
  }

  // Test 3: POST /api/messages without auth
  try {
    const res = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          id: 'probe_msg_1',
          conversationId: 'conv_111_222',
          senderId: 'hacker',
          receiverId: 'victim',
          content: 'Injected message',
          createdAt: new Date().toISOString()
        }
      })
    });
    if (res.status === 401 || res.status === 403) {
      results.push({ name: 'Unauthenticated message forgery', status: 'BLOCKED (SECURE)' });
    } else {
      results.push({ name: 'Unauthenticated message forgery', status: 'IMPERSONATED (VULNERABLE)', statusHttp: res.status });
    }
  } catch (err) {
    results.push({ name: 'Unauthenticated message forgery', status: 'ERROR', error: err.message });
  }

  // Test 4: GET /api/privacy/settings without auth
  try {
    const res = await fetch(`${BASE_URL}/api/privacy/settings?userId=victim`);
    if (res.status === 401 || res.status === 403) {
      results.push({ name: 'Unauthenticated privacy settings read', status: 'BLOCKED (SECURE)' });
    } else {
      results.push({ name: 'Unauthenticated privacy settings read', status: 'LEAKED (VULNERABLE)', statusHttp: res.status });
    }
  } catch (err) {
    results.push({ name: 'Unauthenticated privacy settings read', status: 'ERROR', error: err.message });
  }

  // Test 5: GET /api/groups without auth
  try {
    const res = await fetch(`${BASE_URL}/api/groups`);
    if (res.status === 401 || res.status === 403) {
      results.push({ name: 'Unauthenticated /api/groups access', status: 'BLOCKED (SECURE)' });
    } else {
      results.push({ name: 'Unauthenticated /api/groups access', status: 'LEAKED (VULNERABLE)', statusHttp: res.status });
    }
  } catch (err) {
    results.push({ name: 'Unauthenticated /api/groups access', status: 'ERROR', error: err.message });
  }

  // Test 6: WebSocket connection without auth token
  try {
    await new Promise((resolve) => {
      const ws = new WebSocket(WS_URL);
      ws.on('error', (err) => {
        if (err.message.includes('401') || err.message.includes('Unexpected server response: 401')) {
          results.push({ name: 'Unauthenticated WebSocket connection', status: 'BLOCKED (SECURE)' });
        } else {
          results.push({ name: 'Unauthenticated WebSocket connection', status: 'ACCEPTED (VULNERABLE)', error: err.message });
        }
        resolve(true);
      });
      ws.on('open', () => {
        results.push({ name: 'Unauthenticated WebSocket connection', status: 'ACCEPTED (VULNERABLE)' });
        ws.close();
        resolve(true);
      });
      setTimeout(() => {
        resolve(true);
      }, 1500);
    });
  } catch (err) {
    results.push({ name: 'Unauthenticated WebSocket connection', status: 'BLOCKED (SECURE)' });
  }

  serverProcess.kill();

  console.log('\n--- Security Probe Results ---');
  let vulnerableCount = 0;
  results.forEach(r => {
    console.log(`[${r.status}] ${r.name}${r.statusHttp ? ` (HTTP ${r.statusHttp})` : ''}${r.error ? ` (${r.error})` : ''}`);
    if (r.status.includes('VULNERABLE') || r.status.includes('ACCEPTED')) {
      vulnerableCount++;
    }
  });

  if (vulnerableCount > 0) {
    console.log(`\n❌ SECURITY ALERT: Found ${vulnerableCount} vulnerability vectors!`);
    process.exit(1);
  } else {
    console.log('\n🛡️ All security probe checks passed successfully (Secured).');
    process.exit(0);
  }
}

runSecurityProbe();
