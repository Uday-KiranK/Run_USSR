require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

const BASE = 'http://localhost:5000';

function call(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(
      { hostname: 'localhost', port: 5000, path, method, headers },
      res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) })); }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function log(step, label, data) {
  console.log(`\n[Step ${step}] ${label}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

function assert(condition, msg) {
  if (!condition) { console.error(`  FAIL: ${msg}`); process.exit(1); }
  console.log(`  OK: ${msg}`);
}

async function run() {
  // Seed a regular test user directly in DB
  await connectDB();
  await User.deleteOne({ phoneNumber: '+910000000001' });
  const testUser = await User.create({
    phoneNumber: '+910000000001', name: 'Test User',
    role: 'USER', verified: true, enabled: true,
  });
  console.log('\n--- Cloakbe End-to-End Test ---');
  console.log('Test user ready:', testUser.phoneNumber);

  // ─── STEP 1: Admin login ───────────────────────────────────────────
  const loginRes = await call('POST', '/api/auth/admin/login', { phone: '+919999999999', password: 'admin123' });
  log(1, 'Admin login', { status: loginRes.status, message: loginRes.body.message });
  assert(loginRes.status === 200, 'Admin login returns 200');
  const token = loginRes.body.token;

  // ─── STEP 2: Create a site ────────────────────────────────────────
  const siteRes = await call('POST', '/api/sites', { name: 'E2E Test Mall', address: '1 Test Road', state: 'Test State' }, token);
  log(2, 'Create site', { status: siteRes.status, name: siteRes.body.data?.name });
  assert(siteRes.status === 201, 'Site created');
  const siteId = siteRes.body.data._id;

  // ─── STEP 3: Create terminal ──────────────────────────────────────
  const termRes = await call('POST', '/api/terminals', { siteId, identifiableName: 'E2E Terminal', physicalLocation: 'Floor 1' }, token);
  log(3, 'Create terminal', { status: termRes.status, name: termRes.body.data?.identifiableName, termStatus: termRes.body.data?.status });
  assert(termRes.status === 201, 'Terminal created');
  assert(termRes.body.data.status === 'SETUP_IN_PROGRESS', 'Terminal starts in SETUP_IN_PROGRESS');
  const termId = termRes.body.data._id;

  // ─── STEP 4: Setup 4x7 layout — all SMALL except D-3 (row=3,col=2) = MEDIUM ──
  const layoutRes = await call('POST', `/api/terminals/${termId}/layout`, {
    rows: 4, cols: 7,
    defaultType: 'SMALL',
    boxes: [{ row: 3, col: 2, type: 'MEDIUM' }],
  }, token);
  log(4, 'Setup 4×7 custom layout', {
    status: layoutRes.status,
    layoutType: layoutRes.body.data?.terminalMetaData?.layoutType,
    rows: layoutRes.body.data?.terminalMetaData?.rows,
    cols: layoutRes.body.data?.terminalMetaData?.columns,
    totalBoxes: layoutRes.body.data?.boxCount,
  });
  assert(layoutRes.status === 201, 'Layout created');
  assert(layoutRes.body.data.terminalMetaData.layoutType === 'CUSTOM', 'layoutType is CUSTOM');
  assert(layoutRes.body.data.terminalMetaData.rows === 4, 'rows = 4');
  assert(layoutRes.body.data.terminalMetaData.columns === 7, 'cols = 7');
  assert(layoutRes.body.data.boxCount === 28, 'total boxes = 28 (4×7)');

  // ─── STEP 5: Verify box types ─────────────────────────────────────
  const boxesRes = await call('GET', `/api/boxes/terminal/${termId}`, null, token);
  const allBoxes = boxesRes.body.data.boxes;
  const mediumBoxes = allBoxes.filter(b => b.type === 'MEDIUM');
  const smallBoxes  = allBoxes.filter(b => b.type === 'SMALL');
  const targetBox   = mediumBoxes[0]; // should be D-3 (row=3, col=2)
  log(5, 'Verify box sizes', {
    total: allBoxes.length,
    SMALL: smallBoxes.length,
    MEDIUM: mediumBoxes.length,
    mediumBox: mediumBoxes.map(b => ({ name: b.identifiableName, row: b.row, col: b.col })),
  });
  assert(allBoxes.length === 28, 'All 28 boxes present');
  assert(smallBoxes.length === 27, '27 SMALL boxes');
  assert(mediumBoxes.length === 1, '1 MEDIUM box');
  assert(targetBox.row === 3 && targetBox.col === 2, 'MEDIUM box is at row=3, col=2');
  assert(targetBox.identifiableName === 'D-3', 'MEDIUM box label is D-3');

  // ─── STEP 6: Book a box (admin creates order) ────────────────────
  const availableBox = allBoxes.find(b => b.boxStatus === 'EMPTY_CLOSED');
  const orderRes = await call('POST', '/api/orders', {
    terminalId: termId,
    boxId: availableBox._id,
    phoneNumber: '+910000000001',
  }, token);
  log(6, 'Create order (book a box)', {
    status: orderRes.status,
    orderId: orderRes.body.data?.orderId,
    boxName: orderRes.body.data?.boxName,
    orderStatus: orderRes.body.data?.status,
    accessCode: orderRes.body.data?.accessCode,
  });
  assert(orderRes.status === 201, 'Order created');
  assert(orderRes.body.data.status === 'READY_FOR_PICKUP', 'Order status = READY_FOR_PICKUP');
  const accessCode = orderRes.body.data.accessCode;
  const orderId = orderRes.body.data.orderId;

  // ─── STEP 7: Verify box is now BOOKED ────────────────────────────
  const bookedBoxRes = await call('GET', `/api/boxes/${availableBox._id}`, null, token);
  log(7, 'Box status after booking', { boxStatus: bookedBoxRes.body.data?.boxStatus });
  assert(bookedBoxRes.body.data.boxStatus === 'BOOKED', 'Box is BOOKED');

  // ─── STEP 8: User enters access code at kiosk ────────────────────
  const accessRes = await call('POST', '/api/orders/access', { accessCode });
  log(8, 'User enters access code at kiosk', {
    status: accessRes.status,
    message: accessRes.body.message,
    boxStatus: accessRes.body.data?.boxStatus,
  });
  assert(accessRes.status === 200, 'Access code accepted');
  assert(accessRes.body.data.boxStatus === 'OPEN_REQUESTED', 'Box moves to OPEN_REQUESTED');

  // ─── STEP 9: Hardware confirms box is open (sim) ──────────────────
  const simRes = await call('POST', `/api/sim/box/${availableBox._id}/opened`, null, token);
  log(9, 'Hardware confirms box open [SIM]', {
    status: simRes.status,
    message: simRes.body.message,
    boxStatus: simRes.body.data?.boxStatus,
    orderStatus: simRes.body.data?.orderStatus,
  });
  assert(simRes.status === 200, 'Sim open confirmed');
  assert(simRes.body.data.boxStatus === 'OCCUPIED_OPEN', 'Box is OCCUPIED_OPEN (access mode)');
  assert(simRes.body.data.orderStatus === 'IN_PROGRESS', 'Order is IN_PROGRESS');

  // ─── STEP 10: Get the order _id for close/complete ───────────────
  const ordersRes = await call('GET', `/api/orders?terminalId=${termId}`, null, token);
  const orderDoc = ordersRes.body.data.find(o => o.orderId === orderId);
  const orderDocId = orderDoc._id;

  // ─── STEP 11: User closes the box ────────────────────────────────
  const closeRes = await call('POST', `/api/orders/${orderDocId}/close`, null, token);
  log(11, 'User closes the box', {
    status: closeRes.status,
    message: closeRes.body.message,
    boxStatus: closeRes.body.data?.boxStatus,
  });
  assert(closeRes.status === 200, 'Box closed');
  assert(closeRes.body.data.boxStatus === 'OCCUPIED_CLOSED', 'Box is OCCUPIED_CLOSED');

  // ─── STEP 12: User completes the order ───────────────────────────
  const completeRes = await call('POST', `/api/orders/${orderDocId}/complete`, null, token);
  log(12, 'User completes order', {
    status: completeRes.status,
    message: completeRes.body.message,
    orderStatus: completeRes.body.data?.status,
  });
  assert(completeRes.status === 200, 'Order completed');
  assert(completeRes.body.data.status === 'COMPLETED', 'Order status = COMPLETED');

  // ─── STEP 13: Verify box is released back ────────────────────────
  const finalBoxRes = await call('GET', `/api/boxes/${availableBox._id}`, null, token);
  log(13, 'Final box status (should be EMPTY_CLOSED)', { boxStatus: finalBoxRes.body.data?.boxStatus });
  assert(finalBoxRes.body.data.boxStatus === 'EMPTY_CLOSED', 'Box released back to EMPTY_CLOSED');

  console.log('\n All 13 steps passed. End-to-end test complete.\n');
  process.exit(0);
}

run().catch(err => { console.error('\nTest crashed:', err.message); process.exit(1); });
