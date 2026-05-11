const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^(FABRIC_API_URL|FABRIC_ADMIN_API_KEY)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

function detectRepoFullName() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
    if (match) return `${match[1]}/${match[2]}`;
  } catch {}
  return null;
}

loadEnvFile();

const apiUrl = process.env.ANTHARA_FABRIC_URL || "";
const apiKey = process.env.ANTHARA_API_KEY || "" ;
const repoFullName = detectRepoFullName();

if (!apiUrl || !apiKey) {
  console.log('Anthara: missing API URL or API key — add them to .claude/settings.local.json');
  process.exit(0);
}

if (!repoFullName) {
  console.log('Anthara: could not detect repository name from git remote');
  process.exit(0);
}

const url = `${apiUrl}/standards/${encodeURIComponent(repoFullName)}`;
const client = url.startsWith('https') ? https : http;

client.get(url, { headers: { accept: 'application/json', Authorization: `Bearer ${apiKey}` } }, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Anthara Coding Standards | Guardrails ');
    console.log('make sure to remember all these while doing coding ');
    console.log(data);
  });
}).on('error', (err) => {
  console.log(`Anthara: failed to fetch standards — ${err.message}`);
});
