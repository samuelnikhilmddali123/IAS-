const { frontendLogin, frontendFetchMenu, frontendRegister } = require('./test_complete_lifecycle');

async function testBackendOff() {
  console.log('================================================================');
  console.log('       RUNNING TEST A: BACKEND OFF / SERVER UNREACHABLE         ');
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

  // 1. Try login with random credentials when backend is OFF
  console.log('1. Testing Login when Backend is OFF...');
  const loginResult = await frontendLogin('9876543210', '123456');
  report('Login fails when backend is stopped (success: false)', loginResult.success === false);
  report('Login does NOT authenticate or return user', loginResult.user === undefined);
  report('Login returns clear backend connection error message', loginResult.error?.includes('Unable to connect to backend server'));

  // 2. Try registration when backend is OFF
  console.log('\n2. Testing Registration when Backend is OFF...');
  const regResult = await frontendRegister({
    name: 'Test Officer',
    phone: '9111122222',
    pin: '123456',
  });
  report('Registration fails when backend is stopped (success: false)', regResult.success === false);
  report('Registration does NOT create a fake local account', regResult.user === undefined);
  report('Registration returns clear connection error', regResult.error?.includes('Unable to connect to backend server'));

  // 3. Try fetching menu when backend is OFF
  console.log('\n3. Testing Menu Loading when Backend is OFF...');
  const menuResult = await frontendFetchMenu();
  report('Menu API fetch fails when backend is stopped', menuResult.error !== null);
  report('Menu items array is completely EMPTY (NO fake/static items)', Array.isArray(menuResult.items) && menuResult.items.length === 0);
  report('Menu shows clear connection error to user', menuResult.error?.includes('Cannot connect to backend server'));

  console.log('\n================================================================');
  console.log(`TEST A SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

testBackendOff().catch(err => {
  console.error('Fatal Test A error:', err);
  process.exit(1);
});
