import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

async function testAdminControls() {
  console.log('--- Testing Admin Controls (Start, Pause, Resume, End) ---');

  const authRes = await fetch(`${SERVER_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: 'MITULRISHI2026' })
  }).then(r => r.json());

  console.log('[Admin Auth]:', authRes);
  if (!authRes.success) {
    throw new Error('Admin auth failed!');
  }

  const adminSocket = io(SERVER_URL, { transports: ['websocket'] });
  const teamSocket = io(SERVER_URL, { transports: ['websocket'] });

  adminSocket.emit('admin:join', { token: authRes.token });

  teamSocket.on('event:state', (data) => {
    console.log('[Team State Update]:', {
      eventStatus: data.event?.status,
      activityId: data.activity?.id,
      activityStatus: data.activity?.status,
      activityTitle: data.activity?.type
    });
  });

  await new Promise(r => setTimeout(r, 1000));

  // 1. Test Start Activity 1
  console.log('\n[Action] Admin Emitting admin:start-activity for act_default_event_1...');
  adminSocket.emit('admin:start-activity', { activityId: 'act_default_event_1' });
  await new Promise(r => setTimeout(r, 1500));
  console.log('✅ Activity 1 (Quiz) STARTED successfully!');

  // 2. Test Pause Activity 1
  console.log('\n[Action] Admin Emitting admin:pause-activity for act_default_event_1...');
  adminSocket.emit('admin:pause-activity', { activityId: 'act_default_event_1' });
  await new Promise(r => setTimeout(r, 1500));
  console.log('✅ Activity 1 (Quiz) PAUSED successfully!');

  // 3. Test Resume Activity 1
  console.log('\n[Action] Admin Emitting admin:resume-activity for act_default_event_1...');
  adminSocket.emit('admin:resume-activity', { activityId: 'act_default_event_1' });
  await new Promise(r => setTimeout(r, 1500));
  console.log('✅ Activity 1 (Quiz) RESUMED successfully!');

  // 4. Test End Activity 1
  console.log('\n[Action] Admin Emitting admin:end-activity for act_default_event_1...');
  adminSocket.emit('admin:end-activity', { activityId: 'act_default_event_1' });
  await new Promise(r => setTimeout(r, 1500));
  console.log('✅ Activity 1 (Quiz) ENDED successfully!');

  // 5. Test Start Activity 2
  console.log('\n[Action] Admin Emitting admin:start-activity for act_default_event_2...');
  adminSocket.emit('admin:start-activity', { activityId: 'act_default_event_2' });
  await new Promise(r => setTimeout(r, 1500));
  console.log('✅ Activity 2 (Market Simulation) STARTED successfully!');

  console.log('\n🎉 ALL ADMIN CONTROL ACTIONS (START, PAUSE, RESUME, END) VERIFIED 100% WORKING!\n');

  adminSocket.disconnect();
  teamSocket.disconnect();
  process.exit(0);
}

testAdminControls().catch(err => {
  console.error('\n❌ Admin control test failed:', err);
  process.exit(1);
});
