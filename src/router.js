const express = require('express');
const { getProjects, getProject, getSession } = require('./data/projects');
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

router.get('/project/:name/session/:sessionId', (req, res) => {
  const session = getSession(req.params.name, req.params.sessionId);
  if (!session) return res.status(404).send('Not found');
  res.send(sessionPage(session));
});

module.exports = router;
