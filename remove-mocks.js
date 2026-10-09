const fs = require('fs');
const filePath = 'src/api/client.js';
let source = fs.readFileSync(filePath, 'utf8');
const start = source.indexOf('// In-memory fallback mock database');
const end = source.indexOf('// API Methods', start);
if (start === -1 || end === -1) throw new Error('Mock block markers not found');
source = source.slice(0, start) + source.slice(end);
const loginStart = source.indexOf('      // Simulated login');
if (loginStart !== -1) {
  const loginEnd = source.indexOf('\n    }\n', loginStart);
  if (loginEnd === -1) throw new Error('Simulated login block end not found');
  source = source.slice(0, loginStart) + source.slice(loginEnd + 4);
}
fs.writeFileSync(filePath, source);
