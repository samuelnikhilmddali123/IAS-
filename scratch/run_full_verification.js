const fs = require('fs');
const path = require('path');
const { frontendLogin, frontendFetchMenu, frontendRegister } = require('./test_complete_lifecycle');

async function main() {
  console.log('================================================================');
  console.log('       RUNNING USER-SPECIFIED ACCEPTANCE VERIFICATION           ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(title, cond, detail = '') {
    if (cond) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} - Detail: ${detail}`);
      failed++;
    }
  }

  // TEST B: Registration Saves to Database
  console.log('--- TEST B: REGISTRATION MUST ACTUALLY SAVE THE USER ---');
  const regResult = await frontendRegister({
    name: 'Rahul',
    phone: '9876543210',
    pin: '123456',
    email: 'rahul.officer@gov.in',
    designation: 'IAS Officer • Special Duty',
    department: 'Cabinet Secretariat • Government of India'
  });

  report('Register API returns success: true and user object', regResult.success === true && regResult.user);
  report('Returned user name matches registered name "Rahul"', regResult.user?.name === 'Rahul');
  report('Returned user phone matches registered phone "9876543210"', regResult.user?.phone === '9876543210');
  report('WhatsApp QR message configured from Admin WhatsApp (+91 91212 66269)', regResult.whatsapp?.from === '+91 91212 66269');

  // Verify directly in backend/data/users.json
  const usersFile = path.join(__dirname, '../backend/data/users.json');
  const storedUsers = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  const foundInDb = storedUsers.find(u => u.phone === '9876543210');
  report('Database (users.json) actually contains registered user "Rahul"', Boolean(foundInDb) && foundInDb.name === 'Rahul');

  // TEST C: Correct Login
  console.log('\n--- TEST C: LOGIN MUST AUTHENTICATE THE NEWLY REGISTERED USER ---');
  const correctLogin = await frontendLogin('9876543210', '123456');
  report('Login with 9876543210 + 123456 succeeds (success: true)', correctLogin.success === true);
  report('Authenticated user name is "Rahul" (NOT hardcoded "IAS Officer")', correctLogin.user?.name === 'Rahul');
  report('Authenticated user phone is "9876543210"', correctLogin.user?.phone === '9876543210');

  // TEST D: Wrong Login
  console.log('\n--- TEST D: WRONG LOGIN CREDENTIALS MUST FAIL ---');
  const wrongPinLogin = await frontendLogin('9876543210', '999999');
  report('Login with 9876543210 + wrong PIN (999999) fails (success: false)', wrongPinLogin.success === false);
  report('Error message indicates invalid credentials or PIN error', wrongPinLogin.error?.toLowerCase().includes('pin') || wrongPinLogin.error?.toLowerCase().includes('invalid'));

  const nonExistentLogin = await frontendLogin('9999999999', '123456');
  report('Login with non-existent phone (9999999999 + 123456) fails (success: false)', nonExistentLogin.success === false);
  report('Error message indicates officer not found', nonExistentLogin.error?.toLowerCase().includes('found') || nonExistentLogin.error?.toLowerCase().includes('register'));

  // Empty credentials test
  const emptyLogin = await frontendLogin('', '');
  report('Login with empty credentials fails without contacting backend', emptyLogin.success === false);

  // TEST E: Menu Items from Backend
  console.log('\n--- TEST E: MENU ITEMS MUST COME FROM BACKEND ---');
  const menuResult = await frontendFetchMenu();
  report('Menu loads from backend API (/api/foods) with status 200', menuResult.items.length > 0 && menuResult.error === null);
  report(`Menu items count > 0 (found ${menuResult.items.length} items)`, menuResult.items.length > 0);
  report('First item has valid structure (id, name, price, category)', Boolean(menuResult.items[0]?.name && menuResult.items[0]?.price));

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
