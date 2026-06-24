const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'projects');

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
      files.push({ name: match[1], filename: match[2], content: stripFrontmatter(fs.readFileSync(filePath, 'utf8')) });
    }
  }

  return { index, files };
}

function buildProject(dirName) {
  const dirPath = path.join(PROJECTS_DIR, dirName);

  const jsonlFiles = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({ name: f, fullPath: path.join(dirPath, f), mtime: fs.statSync(path.join(dirPath, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);

  let cwd = null;
  const sessions = jsonlFiles.map(jf => {
    const meta = parseJsonlMeta(jf.fullPath);
    if (!cwd && meta.cwd) cwd = meta.cwd;
    return { id: jf.name, title: meta.title || '(無題)', date: jf.mtime, turnCount: meta.turnCount };
  });

  const { index: memoryIndex, files: memoryFiles } = readMemory(dirPath);
  const lastUpdated = jsonlFiles.length > 0 ? jsonlFiles[0].mtime : null;

  return {
    dirName,
    cwd: cwd || dirName,
    lastUpdated,
    sessionCount: jsonlFiles.length,
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

module.exports = { getProjects, getProject, getSession };
