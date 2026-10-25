#!/usr/bin/env node

const { execSync } = require('child_process');

const message = process.argv.slice(2).join(' ') || 'done';

const commands = [
  'git-work add .',
  `git-work commit -m "${message.replace(/"/g, '\\"')}"`,
  'git-work push',
];

for (const cmd of commands) {
  console.log(`\n> ${cmd}`);
  try {
    // Using interactive shell invocation so aliases / shell functions like git-work are recognized
    execSync(`zsh -i -c '${cmd}'`, { stdio: 'inherit' });
  } catch (err) {
    try {
      // Fallback to standard shell execution
      execSync(cmd, { stdio: 'inherit', shell: true });
    } catch {
      process.exit(1);
    }
  }
}
