const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/font-black/g, 'font-medium');
content = content.replace(/text-\[11px\]/g, 'text-xs');
content = content.replace(/text-\[9px\]/g, 'text-xs');
content = content.replace(/text-\[8px\]/g, 'text-[10px]');
content = content.replace(/text-\[10px\]/g, 'text-[11px]');
content = content.replace(/tracking-\[0\.2em\]/g, 'tracking-normal');
content = content.replace(/tracking-\[0\.25em\]/g, 'tracking-normal');
content = content.replace(/tracking-\[0\.3em\]/g, 'tracking-normal');
content = content.replace(/\buppercase\b/g, ''); 
content = content.replace(/\bfont-bold\b/g, 'font-medium'); 

fs.writeFileSync('src/App.tsx', content);
