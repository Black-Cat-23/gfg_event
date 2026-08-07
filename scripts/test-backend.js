import { io } from 'socket.io-client';

async function testBackend() {
  console.log('--- 1. Testing HTTP Endpoints ---');

  const healthRes = await fetch('http://localhost:3000/api/health');
  const healthData = await healthRes.json();
  console.log('[HTTP] /api/health:', healthData);

  const eventRes = await fetch('http://localhost:3000/api/event/default_event');
  const eventData = await eventRes.json();
  console.log('[HTTP] /api/event/default_event:', { id: eventData.id, name: eventData.name, status: eventData.status });

  if (healthData.status !== 'ok' || !eventData.id) {
    throw new Error('HTTP Endpoints failed verification!');
  }

  console.log('\n--- 2. Testing Socket.IO Realtime Engine ---');

  const clientSocket = io('http://localhost:3000');
  const adminSocket = io('http://localhost:3000');

  await new Promise((resolve) => clientSocket.on('connect', resolve));
  await new Promise((resolve) => adminSocket.on('connect', resolve));
  console.log('[Socket] Client & Admin sockets connected.');

  // Test Admin Auth
  const adminAuthRes = await new Promise((resolve) => {
    adminSocket.emit('admin:auth', { passcode: 'EVENT2026' }, resolve);
  });
  console.log('[Socket] Admin Auth Result:', adminAuthRes);
  if (!adminAuthRes.success) throw new Error('Admin auth failed!');

  // Test Team Creation
  const teamName = `Alpha_${Date.now()}`;
  const teamCreateRes = await new Promise((resolve) => {
    clientSocket.emit('team:create', { name: teamName }, resolve);
  });
  console.log('[Socket] Team Create Result:', teamCreateRes);
  if (!teamCreateRes.success || !teamCreateRes.teamCode) throw new Error('Team creation failed!');

  // Test Team Rejoin
  const teamJoinRes = await new Promise((resolve) => {
    clientSocket.emit('team:join', { code: teamCreateRes.teamCode }, resolve);
  });
  console.log('[Socket] Team Join Result:', teamJoinRes);
  if (!teamJoinRes.success) throw new Error('Team join failed!');

  console.log('\n✅ ALL BACKEND HTTP AND SOCKET.IO INTEGRATION TESTS PASSED CLEANLY!');

  clientSocket.disconnect();
  adminSocket.disconnect();
  process.exit(0);
}

testBackend().catch((err) => {
  console.error('\n❌ Backend test failed:', err);
  process.exit(1);
});
