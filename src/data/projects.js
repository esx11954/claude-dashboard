const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'projects');
const CACHE_DIR = path.join(__dirname, '..', '..', 'projects');

function getJsonPath(projectDir, jsonlName) {
  return path.join(CACHE_DIR, projectDir, jsonlName.replace(/\.jsonl$/, '.json'));
}

function stripFrontmatter(content) {
  return content.replace(/^---[\s\S]*?---\n?/, '').trim();
}

function parseJsonlMeta(filePath) {
  let cwd = null;
  let title = null;
  let firstDate = null;
  let turnCount = 0;

  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }

    if (!cwd && entry.cwd) cwd = entry.cwd;
    if (!firstDate && entry.timestamp) firstDate = new Date(entry.timestamp);
    if (entry.type === 'ai-title' && entry.aiTitle) title = entry.aiTitle;
    if (entry.type === 'user' && entry.message) turnCount++;
  }

  return { cwd, title, date: firstDate, turnCount };
}

function readMemory(dirPath) {
  const memoryDir = path.join(dirPath, 'memory');
  const indexPath = path.join(memoryDir, 'MEMORY.md');

  if (!fs.existsSync(indexPath)) return { index: null, files: [] };

  const index = fs.readFileSync(indexPath, 'utf8');
  const files = [];
  const linkRe = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
  let match;

  while ((match = linkRe.exec(index)) !== null) {
    const filePath = path.join(memoryDir, match[2]);
    if (fs.existsSync(filePath)) {
      files.push({ name: match[1], filename: match[2], content: stripFrontmatter(fs.readFileSync(filePath, 'utf8')), mtime: fs.statSync(filePath).mtime });
    }
  }

  return { index, files };
}

function buildProject(dirName) {
  const dirPath = path.join(PROJECTS_DIR, dirName);
  const cacheDirPath = path.join(CACHE_DIR, dirName);

  const jsonlFiles = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({ name: f, fullPath: path.join(dirPath, f), mtime: fs.statSync(path.join(dirPath, f)).mtime }));

  const liveJsonlNames = new Set(jsonlFiles.map(f => f.name));

  let cwd = null;
  let syncedCount = 0;
  const sessions = jsonlFiles.map(jf => {
    const jsonPath = getJsonPath(dirName, jf.name);
    if (fs.existsSync(jsonPath)) {
      const cached = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (!cwd && cached.cwd) cwd = cached.cwd;
      syncedCount++;
      return { id: jf.name, title: cached.title || '(無題)', date: new Date(cached.lastModified || jf.mtime), turnCount: cached.turnCount, archived: false };
    }
    const meta = parseJsonlMeta(jf.fullPath);
    if (!cwd && meta.cwd) cwd = meta.cwd;
    return { id: jf.name, title: meta.title || '(無題)', date: jf.mtime, turnCount: meta.turnCount, archived: false };
  });

  let archivedCount = 0;
  if (fs.existsSync(cacheDirPath)) {
    fs.readdirSync(cacheDirPath)
      .filter(f => f.endsWith('.json'))
      .forEach(f => {
        const jsonlName = f.replace(/\.json$/, '.jsonl');
        if (liveJsonlNames.has(jsonlName)) return;
        const jsonPath = path.join(cacheDirPath, f);
        const cached = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (!cwd && cached.cwd) cwd = cached.cwd;
        archivedCount++;
        sessions.push({ id: jsonlName, title: cached.title || '(無題)', date: new Date(cached.lastModified || fs.statSync(jsonPath).mtime), turnCount: cached.turnCount, archived: true });
      });
  }

  sessions.sort((a, b) => b.date - a.date);

  const { index: memoryIndex, files: memoryFiles } = readMemory(dirPath);
  const lastUpdated = sessions.length > 0 ? sessions[0].date : null;
  const liveCount = jsonlFiles.length;

  return {
    dirName,
    cwd: cwd || dirName,
    lastUpdated,
    sessionCount: sessions.length,
    liveCount,
    syncedCount,
    archivedCount,
    hasMemory: !!memoryIndex,
    memoryIndex,
    memoryFiles,
    sessions,
  };
}

function getProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  return fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => buildProject(d.name))
    .filter(p => p.sessionCount > 0 || p.hasMemory)
    .sort((a, b) => {
      if (!a.lastUpdated) return 1;
      if (!b.lastUpdated) return -1;
      return b.lastUpdated - a.lastUpdated;
    });
}

function getProject(dirName) {
  const dirPath = path.join(PROJECTS_DIR, dirName);
  if (!fs.existsSync(dirPath)) return null;
  return buildProject(dirName);
}

function getSession(dirName, sessionId) {
  const jsonPath = getJsonPath(dirName, sessionId);
  if (fs.existsSync(jsonPath)) {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }

  const filePath = path.join(PROJECTS_DIR, dirName, sessionId);
  if (!fs.existsSync(filePath)) return null;

  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
  let title = null;
  let cwd = null;
  let date = null;
  const messages = [];

  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }

    if (!cwd && entry.cwd) cwd = entry.cwd;
    if (!date && entry.timestamp) date = new Date(entry.timestamp);
    if (entry.type === 'ai-title' && entry.aiTitle) title = entry.aiTitle;

    if (entry.type === 'user' && entry.message) {
      const content = entry.message.content;
      const text = typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.filter(c => c.type === 'text').map(c => c.text).join('').trim()
          : '';
      if (text) messages.push({ role: 'user', text });
    }

    if (entry.type === 'assistant' && entry.message) {
      const content = entry.message.content;
      if (Array.isArray(content)) {
        const text = content.filter(c => c.type === 'text').map(c => c.text).join('').trim();
        if (text) messages.push({ role: 'assistant', text });
      }
    }
  }

  return { title: title || '(無題)', cwd, date, messages };
}

function getMemoryFile(dirName, filename) {
  const filePath = path.join(PROJECTS_DIR, dirName, 'memory', filename);
  if (!fs.existsSync(filePath)) return null;
  return { path: filePath, content: fs.readFileSync(filePath, 'utf8') };
}

function saveMemoryFile(dirName, filename, content) {
  const filePath = path.join(PROJECTS_DIR, dirName, 'memory', filename);
  if (!fs.existsSync(path.dirname(filePath))) return false;
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

module.exports = { getProjects, getProject, getSession, getMemoryFile, saveMemoryFile, CACHE_DIR, getJsonPath, PROJECTS_DIR };
