require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const connectDB = require('../src/config/db');

function call(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request({ hostname: 'localhost', port: 5000, path, method, headers }, res => {
      let b = ''; res.on('data', c => (b += c)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  await connectDB();

  // Admin login
  const login = await call('POST', '/api/auth/admin/login', { phone: '+919999999999', password: 'admin123' });
  const token = login.body.token;
  console.log('1. Admin login:', login.body.message);

  // Create site
  const site = await call('POST', '/api/sites', { name: 'Atlas Test Mall', address: '8 Atlas Road', state: 'Cloud State' }, token);
  const siteId = site.body.data._id;
  console.log('2. Site:', site.body.data.name, '| _id:', siteId);

  // Create terminal
  const term = await call('POST', '/api/terminals', { siteId, identifiableName: 'Atlas Terminal 8x4', physicalLocation: 'Level 3' }, token);
  const termId = term.body.data._id;
  console.log('3. Terminal:', term.body.data.identifiableName, '| _id:', termId);

  // Setup 8x4 layout with mixed sizes
  const layoutBody = {
    rows: 8,
    cols: 4,
    defaultType: 'SMALL',
    boxes: [
      { row: 0, col: 0, type: 'LARGE' },
      { row: 0, col: 1, type: 'LARGE' },
      { row: 1, col: 0, type: 'MEDIUM' },
      { row: 1, col: 1, type: 'MEDIUM' },
      { row: 7, col: 3, type: 'EXTRA_LARGE' },
    ],
  };
  const layout = await call('POST', '/api/terminals/' + termId + '/layout', layoutBody, token);
  const meta = layout.body.data.terminalMetaData;

  console.log('\n--- Layout Result ---');
  console.log('layoutType :', meta.layoutType);
  console.log('rows       :', meta.rows);
  console.log('cols       :', meta.columns);
  console.log('totalBoxes :', layout.body.data.boxCount, '(8 x 4 =', meta.rows * meta.columns, ')');
  console.log('metaData_id:', meta._id);

  // Fetch all boxes
  const boxRes = await call('GET', '/api/boxes/terminal/' + termId, null, token);
  const boxes = boxRes.body.data.boxes;

  const counts = {};
  boxes.forEach(b => { counts[b.type] = (counts[b.type] || 0) + 1; });

  console.log('\n--- Box Size Breakdown ---');
  Object.entries(counts).forEach(function(entry) { console.log(' ', entry[0] + ':', entry[1]); });

  console.log('\n--- Non-SMALL Boxes ---');
  boxes.filter(b => b.type !== 'SMALL').forEach(function(b) {
    console.log(' ', b.identifiableName, '| type:', b.type, '| row:', b.row, '| col:', b.col);
  });

  console.log('\n--- Verify on MongoDB Atlas ---');
  console.log('Go to: https://cloud.mongodb.com');
  console.log('Database: cloakbe');
  console.log('');
  console.log('Collection: terminals');
  console.log('  Filter: { "_id": { "$oid": "' + termId + '" } }');
  console.log('');
  console.log('Collection: terminalmetadatas');
  console.log('  Filter: { "terminalId": { "$oid": "' + termId + '" } }');
  console.log('');
  console.log('Collection: boxes');
  console.log('  Filter: { "terminalId": { "$oid": "' + termId + '" } }');
  console.log('  You should see 32 documents.');

  process.exit(0);
}

run().catch(function(e) { console.error('Error:', e.message); process.exit(1); });
