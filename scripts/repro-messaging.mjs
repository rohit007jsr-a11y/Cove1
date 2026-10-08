import WebSocket from 'ws';
import { spawn } from 'child_process';

const PORT = 3002;
const WS_URL = `ws://127.0.0.1:${PORT}/ws`;
const HTTP_URL = `http://127.0.0.1:${PORT}/api/messages`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('Starting test server on port 3002...');
  const serverProcess = spawn('npx', ['tsx', 'server.ts'], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
    stdio: 'inherit'
  });

  await sleep(4000);

  console.log('Running messaging regression tests...');
  const results = [];

  try {
    const health = await fetch(`http://127.0.0.1:${PORT}/api/health`);
    if (!health.ok) throw new Error('Health check failed');
  } catch (e) {
    serverProcess.kill();
    console.error(`Server failed to boot at port ${PORT}:`, e);
    process.exit(1);
  }

  // Test 1: WS A -> B message delivery & ack
  try {
    await new Promise((resolve, reject) => {
      const wsA = new WebSocket(WS_URL);
      const wsB = new WebSocket(WS_URL);
      let bReceived = false;
      let aAcked = false;

      const checkDone = () => {
        if (bReceived && aAcked) {
          wsA.close();
          wsB.close();
          resolve(true);
        }
      };

      wsB.on('open', () => {
        wsB.send(JSON.stringify({ type: 'auth', userId: 'userB', userName: 'User B' }));
      });

      wsB.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'message:receive' && msg.message.text === 'Hello via WS') {
          bReceived = true;
          checkDone();
        }
      });

      wsA.on('open', () => {
        wsA.send(JSON.stringify({ type: 'auth', userId: 'userA', userName: 'User A' }));
        setTimeout(() => {
          wsA.send(JSON.stringify({
            type: 'message:send',
            message: {
              id: 'msg_ws_1',
              conversationId: 'conv_userA_userB',
              senderId: 'userA',
              receiverId: 'userB',
              text: 'Hello via WS',
              createdAt: new Date().toISOString()
            }
          }));
        }, 300);
      });

      wsA.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'message:ack' && msg.messageId === 'msg_ws_1') {
          aAcked = true;
          checkDone();
        }
      });

      setTimeout(() => {
        wsA.close();
        wsB.close();
        reject(new Error('Timeout waiting for WS message delivery'));
      }, 3000);
    });
    results.push({ name: 'WS A->B Delivery & Ack', status: 'PASS' });
  } catch (err) {
    results.push({ name: 'WS A->B Delivery & Ack', status: 'FAIL', error: err.message });
  }

  // Test 2: HTTP POST /api/messages
  try {
    const res = await fetch(HTTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          id: 'msg_http_1',
          conversationId: 'conv_userA_userB',
          senderId: 'userA',
          receiverId: 'userB',
          text: 'Hello via HTTP',
          createdAt: new Date().toISOString()
        }
      })
    });
    const json = await res.json();
    if (!res.ok || !json) {
      throw new Error(`HTTP fallback failed with status ${res.status}`);
    }
    results.push({ name: 'HTTP /api/messages fallback', status: 'PASS' });
  } catch (err) {
    results.push({ name: 'HTTP /api/messages fallback', status: 'FAIL', error: err.message });
  }

  // Test 3: Non-conv_ conversation id error check (D3 regression assertion)
  try {
    await new Promise((resolve, reject) => {
      const wsA = new WebSocket(WS_URL);
      let receivedErrorOrNoAck = false;

      wsA.on('open', () => {
        wsA.send(JSON.stringify({ type: 'auth', userId: 'userA', userName: 'User A' }));
        setTimeout(() => {
          wsA.send(JSON.stringify({
            type: 'message:send',
            message: {
              id: 'msg_bad_1',
              conversationId: 'bad_conversation_id',
              senderId: 'userA',
              text: 'Bad conv message',
              createdAt: new Date().toISOString()
            }
          }));
        }, 200);
      });

      wsA.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'message:error') {
          receivedErrorOrNoAck = true;
          wsA.close();
          resolve(true);
        } else if (msg.type === 'message:ack' && msg.messageId === 'msg_bad_1') {
          wsA.close();
          reject(new Error('Server incorrectly acked message with invalid conversation ID instead of returning message:error'));
        }
      });

      setTimeout(() => {
        wsA.close();
        if (receivedErrorOrNoAck) {
          resolve(true);
        } else {
          reject(new Error('Timeout waiting for message:error on invalid conversation ID'));
        }
      }, 2000);
    });
    results.push({ name: 'D3: Invalid conversation ID error validation', status: 'PASS' });
  } catch (err) {
    results.push({ name: 'D3: Invalid conversation ID error validation', status: 'FAIL', error: err.message });
  }

  serverProcess.kill();

  console.log('\n--- Test Results ---');
  let hasFail = false;
  results.forEach(r => {
    console.log(`[${r.status}] ${r.name}${r.error ? ` (${r.error})` : ''}`);
    if (r.status === 'FAIL') hasFail = true;
  });

  if (hasFail) {
    console.log('\nSome tests failed.');
    process.exit(1);
  } else {
    console.log('\nAll tests passed successfully!');
    process.exit(0);
  }
}

runTests();
