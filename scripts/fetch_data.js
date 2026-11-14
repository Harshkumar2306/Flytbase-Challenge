const fs = require('fs');
const path = require('path');

const TOKEN = process.env.AQ_TOKEN || '';
const BASE = 'https://questathon.aihackerscollective.com/api/public/v1';

const ENDPOINTS = [
  { url: '/pack/A/all', file: './data/paperwork_A.json' },
  { url: '/pack/B/all', file: './data/paperwork_B.json' },
  { url: '/pack/team', file: './data/flytbase_team.json' },
  { url: '/pack/feature-requests', file: './data/feature_requests.json' },
  { url: '/pack/release-notes', file: './data/release_notes.json' },
  { url: '/schema', file: './data/schema.json' },
  { url: '/files/flight_log_force_month', file: './data/files/flight_log_force_month.json' },
  { url: '/files/support_ticket_history', file: './data/files/support_ticket_history.json' },
  { url: '/files/dataflow_pack', file: './data/files/dataflow_pack.json' },
  { url: '/files/helicopter_cost_overtime', file: './data/files/helicopter_cost_overtime.json' },
  { url: '/notes', file: './data/notes.json' }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(urlPath, filename) {
  while (true) {
    try {
      console.log(`[${new Date().toISOString()}] Requesting: ${urlPath}`);
      const res = await fetch(`${BASE}${urlPath}`, {
        headers: { authorization: `Bearer ${TOKEN}` }
      });
      
      const text = await res.text();
      
      if (res.status === 200) {
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        fs.writeFileSync(filename, text);
        console.log(`[${new Date().toISOString()}] SUCCESS ${urlPath} -> ${filename} (${text.length} bytes)`);
        // Wait 61 seconds before next call to respect 1 call/min limit
        await sleep(61000);
        return;
      }
      
      if (res.status === 429) {
        let waitSec = 61;
        try {
          const parsed = JSON.parse(text);
          if (parsed.retry_after_seconds) {
            waitSec = parsed.retry_after_seconds + 2;
          }
        } catch (_) {}
        console.log(`[${new Date().toISOString()}] 429 Rate limited. Waiting ${waitSec}s...`);
        await sleep(waitSec * 1000);
      } else {
        console.error(`[${new Date().toISOString()}] Unexpected status ${res.status}: ${text.slice(0, 200)}`);
        await sleep(61000);
        return;
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Fetch error on ${urlPath}:`, err.message);
      await sleep(10000);
    }
  }
}

async function main() {
  console.log("Starting data fetch sequence...");
  for (const item of ENDPOINTS) {
    if (fs.existsSync(item.file)) {
      const stats = fs.statSync(item.file);
      if (stats.size > 200) {
        console.log(`Already have ${item.file} (${stats.size} bytes), skipping`);
        continue;
      }
    }
    await fetchWithRetry(item.url, item.file);
  }
  console.log("Data fetch sequence complete!");
}

main().catch(console.error);
