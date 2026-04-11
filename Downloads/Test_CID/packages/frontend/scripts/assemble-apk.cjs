/**
 * Cross-platform: run Gradle assembleDebug after cap sync.
 * Usage: node scripts/assemble-apk.cjs
 */
const { execSync } = require('child_process');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');
const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
execSync(`${gradle} assembleDebug`, { cwd: androidDir, stdio: 'inherit' });
console.log('\nAPK: android/app/build/outputs/apk/debug/app-debug.apk\n');
