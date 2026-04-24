const fs = require('fs');
fs.appendFileSync('src/index.css', '\n\n/* Fix chart focus outline */\n.recharts-wrapper,\n.recharts-surface,\n.recharts-layer { outline: none !important; }\n');
