const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Reduce huge text again just in case
content = content.replace(/\btext-4xl\b/g, 'text-2xl');
content = content.replace(/\btext-3xl\b/g, 'text-xl');

// Decrease some paddings a bit more
content = content.replace(/\bp-5\b/g, 'p-3');
content = content.replace(/\bp-4\b/g, 'p-3');
content = content.replace(/\bp-6\b/g, 'p-4');

// Reduce heights more
content = content.replace(/\bh-40\b/g, 'h-32');
content = content.replace(/\bh-36\b/g, 'h-28');

// Decrease the big central add button
content = content.replace(/\bw-14 h-14\b/g, 'w-10 h-10');
content = content.replace(/\b-top-6\b/g, '-top-4');
content = content.replace(/\b-top-8\b/g, '-top-4'); // fixing old ones

// The word "uppercase" taking too much space in small text
content = content.replace(/\buppercase\b/g, '');

fs.writeFileSync('src/App.tsx', content);
