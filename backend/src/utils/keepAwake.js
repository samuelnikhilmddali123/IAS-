/**
 * keepAwake.js
 * Prevents Windows / Host OS from going to sleep while the Restaurant Server is running.
 * Uses powercfg and native SetThreadExecutionState (ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED).
 */

const { exec } = require('child_process');
const path = require('path');
const os = require('os');

function enableWindowsKeepAwake() {
  if (os.platform() !== 'win32') return;

  const scriptPath = path.join(__dirname, 'KeepAwake.ps1');

  // 1. Configure Windows power scheme to disable idle timeouts
  exec('powercfg /change standby-timeout-ac 0 && powercfg /change standby-timeout-dc 0 && powercfg /change hibernate-timeout-ac 0', (err) => {
    if (!err) {
      console.log('⚡ [POWER-CONFIG] Windows Standby/Sleep Timeouts Set to NEVER (0 mins)');
    }
  });

  // 2. Invoke Kernel32 SetThreadExecutionState
  const runKernelKeepAwake = () => {
    exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (err, stdout) => {
      if (!err && stdout.includes('SUCCESS')) {
        console.log('🛡️ [KEEP-AWAKE] Windows Continuous Execution Active (Sleep Blocked)');
      }
    });
  };

  runKernelKeepAwake();

  // Periodically refresh execution state every 15 minutes
  setInterval(runKernelKeepAwake, 15 * 60 * 1000);
}

module.exports = {
  enableWindowsKeepAwake
};
