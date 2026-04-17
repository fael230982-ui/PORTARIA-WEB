import fs from 'node:fs';

const files = process.argv.slice(2);

function repairLine(line) {
  let current = line;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const repaired = Buffer.from(current, 'latin1').toString('utf8');
    if (repaired === current || repaired.includes('\uFFFD')) {
      break;
    }
    current = repaired;
  }

  return current;
}

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const repaired = original
    .split(/\r?\n/)
    .map((line) => (/[ÃÂÆÅ]/.test(line) ? repairLine(line) : line))
    .join('\n');

  fs.writeFileSync(file, repaired, 'utf8');
}
