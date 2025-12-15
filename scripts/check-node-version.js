#!/usr/bin/env node
/**
 * Check Node version matches .nvmrc
 * Runs automatically during pnpm install (postinstall hook)
 */

const fs = require('fs');
const path = require('path');

const nvmrcPath = path.join(__dirname, '..', '.nvmrc');
const currentVersion = process.version;

try {
  const requiredVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
  const currentMajor = parseInt(currentVersion.slice(1).split('.')[0]);
  const requiredMajor = parseInt(requiredVersion.split('.')[0]);

  if (currentMajor !== requiredMajor) {
    console.error('\n⚠️  WARNING: Node version mismatch!\n');
    console.error(`   Current:  ${currentVersion}`);
    console.error(`   Required: v${requiredVersion} (Node ${requiredMajor}.x)\n`);
    console.error('   This may cause build failures in production.\n');
    console.error('   To fix, run:');
    console.error(`   nvm use ${requiredMajor}\n`);

    // Don't fail the install, just warn
    process.exit(0);
  }
} catch (err) {
  // Silently skip if .nvmrc doesn't exist
}
