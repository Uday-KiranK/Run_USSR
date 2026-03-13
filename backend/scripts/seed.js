require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

const User = require('../src/models/User');
const Site = require('../src/models/Site');
const Terminal = require('../src/models/Terminal');
const TerminalMetaData = require('../src/models/TerminalMetaData');
const Box = require('../src/models/Box');
const Pricing = require('../src/models/Pricing');
const { generateBoxLabel } = require('../src/utils/helpers');

// PDF field names: FIVEBYFOUR = 4 rows x 5 cols = 20 boxes per terminal
const LAYOUT_TYPE = 'FIVEBYFOUR';
const ROWS = 4;
const COLS = 5;

const seedBoxes = async (terminalId, terminalMetaDataId) => {
  const boxDocs = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      boxDocs.push({
        terminalId,
        terminalMetaDataId,
        identifiableName: generateBoxLabel(r, c),
        row: r,
        col: c,
        type: 'MEDIUM',
        boxStatus: 'EMPTY_CLOSED',
        port: r * COLS + c,
      });
    }
  }
  await Box.insertMany(boxDocs);
};

const seed = async () => {
  await connectDB();
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany(),
    Site.deleteMany(),
    Terminal.deleteMany(),
    TerminalMetaData.deleteMany(),
    Box.deleteMany(),
    Pricing.deleteMany(),
  ]);

  console.log('Creating admin user...');
  // PDF User fields: phoneNumber, password, name, email, verified, enabled, roles
  await User.create({ phoneNumber: '0800000000', verified: true, enabled: true, role: 'ADMIN' });

  console.log('Creating sites...');
  // PDF Site fields: name, address, state, latitude, longitude, pincode
  const [site1, site2] = await Site.create([
    { name: 'Central World', address: '4/1 Ratchadamri Rd', state: 'Bangkok', latitude: 13.7466, longitude: 100.5393, pincode: 10330 },
    { name: 'Siam Paragon', address: '991 Rama I Rd', state: 'Bangkok', latitude: 13.7463, longitude: 100.5347, pincode: 10330 },
  ]);

  console.log('Creating terminals and layouts...');
  for (const site of [site1, site2]) {
    // PDF Terminal fields: siteId, identifiableName, description, physicalLocation, status
    const terminal = await Terminal.create({
      siteId: site._id,
      identifiableName: `Terminal 1 - ${site.name}`,
      description: 'Main locker terminal',
      physicalLocation: 'Ground Floor, Near Entrance',
      status: 'ACTIVE',
    });
    // PDF TerminalMetaData fields: terminalId, layoutType, maxPorts, enabled, skipPayment
    const meta = await TerminalMetaData.create({
      terminalId: terminal._id,
      layoutType: LAYOUT_TYPE,
      maxPorts: ROWS * COLS,
      enabled: true,
      skipPayment: false,
    });
    await seedBoxes(terminal._id, meta._id);
  }

  console.log('Creating pricing config...');
  // PDF Pricing fields: config (JSON string), createdBy, updatedBy
  const pricingConfig = JSON.stringify({
    rates: { SMALL: 20, MEDIUM: 35, LARGE: 50, EXTRA_LARGE: 70 },
    currency: 'THB',
  });
  await Pricing.create({ config: pricingConfig, createdBy: 'seed', updatedBy: 'seed' });

  console.log('Seed complete. 2 sites, 2 terminals, 40 boxes (FIVEBYFOUR), 1 pricing config.');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
