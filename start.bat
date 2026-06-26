@echo off
cd /d "%~dp0"
pm2 start src/server.js --name claude-dashboard
pm2 save
echo Dashboard running at http://localhost:3005
