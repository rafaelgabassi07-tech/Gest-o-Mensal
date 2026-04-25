import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');
fs.writeFileSync('src/App.tsx', content.replace(/blue-([0-9]{2,3})/g, 'primary-$1'));
