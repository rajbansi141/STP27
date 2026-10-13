import fs from 'node:fs';
import { execSync } from 'node:child_process';

const mode = process.argv[2] || 'sqlite';
const schemaPath = 'prisma/schema.prisma';

let schema = fs.readFileSync(schemaPath, 'utf8');

if (mode === 'sqlite') {
  console.log('Switching Prisma schema to SQLite (zero-config local development)...');
  schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  schema = schema.replace(/url\s*=\s*env\("DATABASE_URL"\)/g, 'url = "file:./dev.db"');
} else if (mode === 'postgres' || mode === 'postgresql') {
  console.log('Switching Prisma schema to PostgreSQL (production/staging)...');
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  schema = schema.replace(/url\s*=\s*"file:\.\/dev\.db"/g, 'url = env("DATABASE_URL")');
} else {
  console.error('Unknown mode:', mode, 'Use "sqlite" or "postgres"');
  process.exit(1);
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Running prisma format and generate...');
execSync('npx prisma format', { stdio: 'inherit' });
execSync('npx prisma generate', { stdio: 'inherit' });
console.log(`Prisma successfully configured for ${mode}!`);
