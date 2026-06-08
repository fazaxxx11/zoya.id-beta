const fs = require('fs');
const { execSync } = require('child_process');

let hasError = false;

console.log('🔍 Checking environment configuration...\n');

// Check 1: .env is NOT in git
try {
  const gitFiles = execSync('git ls-files .env', { encoding: 'utf8' }).trim();
  if (gitFiles) {
    console.log('❌ FAIL: .env file is tracked in git.');
    console.log('   Run: git rm --cached .env');
    hasError = true;
  } else {
    console.log('✅ PASS: .env is not tracked in git.');
  }
} catch (error) {
  // git ls-files returns non-zero exit code when file is not tracked
  if (error.status === 1) {
    console.log('✅ PASS: .env is not tracked in git.');
  } else {
    console.log('❌ FAIL: Could not check git status.');
    hasError = true;
  }
}

// Check 2: .env.example exists
if (fs.existsSync('.env.example')) {
  console.log('✅ PASS: .env.example exists.');
} else {
  console.log('❌ FAIL: .env.example does not exist.');
  hasError = true;
}

// Check 3: No real API keys in .env.example
if (fs.existsSync('.env.example')) {
  const content = fs.readFileSync('.env.example', 'utf8');
  const lines = content.split('\n');
  const keyPatterns = [/^[^#].*sk_/, /^[^#].*gsk_/, /^[^#].*gc_/];
  let foundRealKeys = false;

  lines.forEach((line, index) => {
    keyPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        console.log(`❌ FAIL: Line ${index + 1} in .env.example may contain a real API key: ${line.trim()}`);
        foundRealKeys = true;
        hasError = true;
      }
    });
  });

  if (!foundRealKeys) {
    console.log('✅ PASS: No real API keys detected in .env.example.');
  }
}

console.log('\n' + (hasError ? '❌ Environment checks failed.' : '✅ All environment checks passed.'));
process.exit(hasError ? 1 : 0);