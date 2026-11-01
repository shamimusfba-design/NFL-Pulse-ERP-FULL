const { execSync } = require('child_process');

try {
  const res = execSync('curl.exe -s http://127.0.0.1:3000/cutting/index.html').toString();
  console.log('HTTP 200, length:', res.length);
  console.log('Has Master Cuttable Planning Register:', res.includes('Master Cuttable Planning Register'));
  console.log('Has Running Lines Input Feeding Status:', res.includes('Running Lines Input Feeding Status'));
  console.log('Has Body vs Rib fabric:', res.includes('Body vs Rib'));
  console.log('Contains "ln":"Sew-01":', res.includes('"ln":"Sew-01"'));
} catch (e) {
  console.log('Err:', e.message);
}
