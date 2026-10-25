#!/usr/bin/env node

const { execSync } = require('child_process');

const message = process.argv.slice(2).join(' ') || 'done';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(`zsh -i -c '${cmd}'`, { stdio: 'inherit' });
  } catch (err) {
    // If commit failed because nothing changed, don't exit
    if (cmd.includes('commit')) {
      console.log('Nothing to commit or already committed.');
      return;
    }
    process.exit(1);
  }
}

run('git-work add .');
run(`git-work commit -m "${message.replace(/"/g, '\\"')}"`);
run('git-work push');

