const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/className="bg-white dark:bg-gray-900 rounded-xl p-4 /g, 'className="bg-white dark:bg-gray-900 rounded-2xl p-5 ');
content = content.replace(/className="bg-white dark:bg-gray-900 p-4 rounded-xl /g, 'className="bg-white dark:bg-gray-900 p-5 rounded-2xl ');
content = content.replace(/className="bg-gray-50 dark:bg-gray-900\/50 p-4 rounded-xl /g, 'className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl ');
content = content.replace(/className="bg-white dark:bg-gray-900 px-4 rounded-xl /g, 'className="bg-white dark:bg-gray-900 px-5 rounded-2xl ');
content = content.replace(/text-xl font-medium tracking-tight/g, 'text-2xl font-semibold tracking-tight');
content = content.replace(/text-lg font-medium tracking-tight/g, 'text-xl font-semibold tracking-tight');

fs.writeFileSync('src/App.tsx', content);
