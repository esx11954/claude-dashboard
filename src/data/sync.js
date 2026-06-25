const fs = require('fs');
const path = require('path');
const { getSession, CACHE_DIR, getJsonPath, PROJECTS_DIR } = require('./projects');

function syncProject(dirName) {
  const srcDir = path.join(PROJECTS_DIR, dirName);
  const dstDir = path.join(CACHE_DIR, dirName);

  if (!fs.existsSync(srcDir)) return { error: 'Project not found' };
  if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });

  const jsonlFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.jsonl'));
  let synced = 0;
  let skipped = 0;

  for (const jsonlFile of jsonlFiles) {
    const jsonPath = getJsonPath(dirName, jsonlFile);
    if (fs.existsSync(jsonPath)) {
      const stored = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const jsonlMtime = fs.statSync(path.join(srcDir, jsonlFile)).mtime;
      if (new Date(stored.lastModified) >= jsonlMtime) { skipped++; continue; }
    }

    const session = getSession(dirName, jsonlFile);
    if (!session) continue;

    const lastModified = fs.statSync(path.join(srcDir, jsonlFile)).mtime;
    const turnCount = session.messages.filter(m => m.role === 'user').length;
    fs.writeFileSync(jsonPath, JSON.stringify({ ...session, turnCount, lastModified }, null, 2), 'utf8');
    synced++;
  }

  return { synced, skipped };
}

module.exports = { syncProject };
