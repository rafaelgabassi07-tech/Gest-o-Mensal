const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Text sizes
content = content.replace(/\btext-6xl\b/g, 'text-4xl');
content = content.replace(/\btext-5xl\b/g, 'text-3xl');
content = content.replace(/\btext-4xl\b/g, 'text-2xl');
content = content.replace(/\btext-3xl\b/g, 'text-xl');
content = content.replace(/\btext-2xl\b/g, 'text-xl');

// Margins and paddings
content = content.replace(/\bp-8\b/g, 'p-4');
content = content.replace(/\bp-6\b/g, 'p-4');
content = content.replace(/\bp-5\b/g, 'p-3');
content = content.replace(/\bpy-8\b/g, 'py-5');
content = content.replace(/\bpy-6\b/g, 'py-4');
content = content.replace(/\bpy-5\b/g, 'py-3');
content = content.replace(/\bpy-4\b/g, 'py-3');

content = content.replace(/\bmb-8\b/g, 'mb-4');
content = content.replace(/\bmb-6\b/g, 'mb-3');
content = content.replace(/\bmb-5\b/g, 'mb-3');

// Gaps
content = content.replace(/\bgap-6\b/g, 'gap-3');
content = content.replace(/\bgap-5\b/g, 'gap-3');
content = content.replace(/\bgap-4\b/g, 'gap-2');

// Heights for charts
content = content.replace(/\bh-60\b/g, 'h-40');
content = content.replace(/\bh-56\b/g, 'h-36');
content = content.replace(/\bh-52\b/g, 'h-32');

// Icons and structural elements
content = content.replace(/\bw-16 h-16\b/g, 'w-10 h-10');
content = content.replace(/\bw-14 h-14\b/g, 'w-10 h-10');
content = content.replace(/\bw-12 h-12\b/g, 'w-9 h-9');
content = content.replace(/\brounded-2xl\b/g, 'rounded-xl'); 
content = content.replace(/\brounded-\[1\.25rem\]\b/g, 'rounded-xl'); 

// Navbar specific
content = content.replace(/\bpb-safe px-6 pt-1\b/g, 'pb-safe px-4 pt-1');
content = content.replace(/\babsolute -top-8 w-14 h-14\b/g, 'absolute -top-6 w-12 h-12');
content = content.replace(/size=\{28\}/g, 'size={22}');
content = content.replace(/size=\{160\}/g, 'size={80}');
content = content.replace(/size=\{120\}/g, 'size={60}');

fs.writeFileSync('src/App.tsx', content);
