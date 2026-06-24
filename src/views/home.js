const { layout, escapeHtml } = require('./layout');

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('ja-JP');
}

function home(projects) {
  const items = projects.map(p => {
    const label = p.cwd.replace(/\\/g, '/').split('/').pop() || p.cwd;
    return `
      <li class="project-item" data-name="${escapeHtml(encodeURIComponent(p.dirName))}">
        <div class="project-name">${escapeHtml(label)}</div>
        <div class="project-sub">${formatDate(p.lastUpdated)}</div>
      </li>`;
  }).join('');

  const script = `
    <script>
      const items = document.querySelectorAll('.project-item');
      const detail = document.getElementById('detail');

      items.forEach(item => {
        item.addEventListener('click', async () => {
          items.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          detail.innerHTML = '<p class="loading">読み込み中...</p>';
          const name = item.dataset.name;
          const res = await fetch('/project/' + name + '?partial=1');
          detail.innerHTML = await res.text();
        });
      });

      detail.addEventListener('click', e => {
        const row = e.target.closest('.session-row');
        if (!row) return;
        const url = '/project/' + row.dataset.project + '/session/' + row.dataset.session;
        window.open(url, '_blank');
      });
    </script>`;

  return layout('プロジェクト一覧', `
    <div class="app">
      <aside class="sidebar">
        <div class="sidebar-header">プロジェクト <span class="count">${projects.length}</span></div>
        <ul class="project-list">${items || '<li class="muted" style="padding:12px">見つかりません</li>'}</ul>
      </aside>
      <div class="detail-pane" id="detail">
        <p class="placeholder">← プロジェクトを選択してください</p>
      </div>
    </div>
    ${script}
  `);
}

module.exports = { home };
