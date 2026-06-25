const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const { getProjects, getProject, getSession, getMemoryFile, saveMemoryFile } = require('./data/projects');
const { syncProject } = require('./data/sync');
const { home } = require('./views/home');
const { projectDetail } = require('./views/project');
const { sessionPage } = require('./views/session');

const router = express.Router();

router.get('/', (req, res) => {
  const projects = getProjects();
  res.send(home(projects));
});

router.get('/project/:name', (req, res) => {
  const project = getProject(req.params.name);
  if (!project) return res.status(404).send('Not found');
  const partial = req.query.partial === '1';
  res.send(projectDetail(project, partial));
});

router.get('/api/memory/:name/:filename', (req, res) => {
  const file = getMemoryFile(req.params.name, req.params.filename);
  if (!file) return res.status(404).json({ error: 'Not found' });
  res.json({ content: file.content });
});

router.post('/api/memory/:name/:filename', express.text({ type: '*/*' }), (req, res) => {
  const ok = saveMemoryFile(req.params.name, req.params.filename, req.body);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.post('/api/launch/:name', (req, res) => {
  const project = getProject(req.params.name);
  if (!project) return res.status(404).json({ error: 'Not found' });

  // CLAUDE_CODE_CHILD_SESSION=1 等を除去しないと、PM2経由起動時にサブセッション扱いされ
  // JSONL未生成・SessionEndフック空振りになる（Claude Code の子プロセス環境変数継承問題）
  // const logFile = path.join(__dirname, '..', '..', 'hooks', 'launch-debug.log');
  // const scriptPath = path.join(__dirname, '..', '..', 'hooks', 'launch-debug.ps1');
  // spawn('cmd.exe', ['/c', 'start', 'pwsh.exe', '-NoExit', '-File', scriptPath, '-Cwd', project.cwd, '-LogFile', logFile], { detached: true, stdio: 'ignore', env: cleanEnv }).unref();
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDE_CODE_CHILD_SESSION;
  delete cleanEnv.CLAUDE_CODE_SESSION_ID;
  delete cleanEnv.CLAUDECODE;
  const cwd = project.cwd.replace(/'/g, "''");
  spawn('cmd.exe', ['/c', 'start', 'pwsh.exe', '-NoExit', '-Command', `Set-Location '${cwd}'; claude`], { detached: true, stdio: 'ignore', env: cleanEnv }).unref();

  res.json({ ok: true });
});

router.post('/api/sync/:name', (req, res) => {
  const result = syncProject(req.params.name);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

router.get('/project/:name/session/:sessionId', (req, res) => {
  const session = getSession(req.params.name, req.params.sessionId);
  if (!session) return res.status(404).send('Not found');
  res.send(sessionPage(session));
});

module.exports = router;
