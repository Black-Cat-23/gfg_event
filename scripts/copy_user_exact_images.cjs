const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Ankit\\.gemini\\antigravity-ide\\brain\\f5115a45-78f7-429c-92cd-5bc6ad1a9477';
const destDir = 'apps/web/public/quiz_images';

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

// Explicit mapping of exact user uploaded images
fs.copyFileSync(path.join(srcDir, 'media__1786034631857.jpg'), path.join(destDir, 'q14.jpg'));
fs.copyFileSync(path.join(srcDir, 'media__1786034733189.jpg'), path.join(destDir, 'q18.jpg'));
fs.copyFileSync(path.join(srcDir, 'media__1786034831563.jpg'), path.join(destDir, 'q20.jpg'));
fs.copyFileSync(path.join(srcDir, 'media__1786034849487.png'), path.join(destDir, 'q20_ans.png'));

console.log('Successfully copied exact 4 images for q14, q18, and q20.');
