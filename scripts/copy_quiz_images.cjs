const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Ankit\\.gemini\\antigravity-ide\\brain\\f5115a45-78f7-429c-92cd-5bc6ad1a9477';
const destDir = 'apps/web/public/quiz_images';

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const files = fs.readdirSync(srcDir)
  .filter(f => f.startsWith('media__'))
  .map(f => ({ name: f, time: fs.statSync(path.join(srcDir, f)).mtimeMs }))
  .sort((a, b) => b.time - a.time);

console.log('Latest 6 media files:');
files.slice(0, 6).forEach((f, i) => console.log(i + 1, f.name, f.time));

// Top 5 files correspond to the 5 user prompt attachments
if (files[4]) fs.copyFileSync(path.join(srcDir, files[4].name), path.join(destDir, 'q12_13.png'));
if (files[3]) fs.copyFileSync(path.join(srcDir, files[3].name), path.join(destDir, 'q14.jpg'));
if (files[2]) fs.copyFileSync(path.join(srcDir, files[2].name), path.join(destDir, 'q18.jpg'));
if (files[1]) fs.copyFileSync(path.join(srcDir, files[1].name), path.join(destDir, 'q20.png'));
if (files[0]) fs.copyFileSync(path.join(srcDir, files[0].name), path.join(destDir, 'q20_ans.png'));

console.log('Copied quiz images cleanly.');
