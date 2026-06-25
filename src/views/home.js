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

      detail.addEventListener('click', async e => {
        const row = e.target.closest('.session-row');
        if (row) {
          const url = '/project/' + row.dataset.project + '/session/' + row.dataset.session;
          window.open(url, '_blank');
          return;
        }

        const btn = e.target.closest('.launch-btn');
        if (btn) {
          btn.disabled = true;
          const res = await fetch('/api/launch/' + btn.dataset.project, { method: 'POST' });
          if (res.ok) {
            btn.textContent = '✓ 起動しました';
            btn.classList.add('launch-btn--ok');
            setTimeout(() => { btn.textContent = 'セッション開始'; btn.classList.remove('launch-btn--ok'); btn.disabled = false; }, 2000);
          } else {
            btn.textContent = 'エラー';
            btn.disabled = false;
          }
        }

        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
          e.preventDefault();
          const { project, filename } = editBtn.dataset;
          const editorArea = detail.querySelector('.editor-area[data-editor="' + filename + '"]');
          const textarea = editorArea.querySelector('.editor-textarea');
          if (editorArea.style.display !== 'none') return;
          const res = await fetch('/api/memory/' + project + '/' + filename);
          const { content } = await res.json();
          textarea.value = content;
          editorArea.style.display = 'block';
          detail.querySelector('.markdown[data-rendered="' + filename + '"]').style.display = 'none';
        }

        const saveBtn = e.target.closest('.save-btn');
        if (saveBtn) {
          const { project, filename } = saveBtn.dataset;
          const editorArea = detail.querySelector('.editor-area[data-editor="' + filename + '"]');
          const textarea = editorArea.querySelector('.editor-textarea');
          saveBtn.disabled = true;
          const res = await fetch('/api/memory/' + project + '/' + filename, {
            method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: textarea.value
          });
          if (res.ok) {
            const html = await fetch('/project/' + project + '?partial=1').then(r => r.text());
            detail.innerHTML = html;
          }
          saveBtn.disabled = false;
        }

        const cancelBtn = e.target.closest('.cancel-btn');
        if (cancelBtn) {
          const filename = cancelBtn.dataset.filename;
          detail.querySelector('.editor-area[data-editor="' + filename + '"]').style.display = 'none';
          detail.querySelector('.markdown[data-rendered="' + filename + '"]').style.display = 'block';
        }

        const syncBtn = e.target.closest('.sync-btn');
        if (syncBtn) {
          const proj = syncBtn.dataset.project;
          const status = detail.querySelector('#sync-status');
          syncBtn.disabled = true;
          status.textContent = '同期中...';
          try {
            const res = await fetch('/api/sync/' + proj, { method: 'POST' });
            const data = await res.json();
            if (data.error) {
              status.textContent = 'エラー: ' + data.error;
              syncBtn.disabled = false;
            } else {
              const html = await fetch('/project/' + proj + '?partial=1').then(r => r.text());
              detail.innerHTML = html;
              const newStatus = detail.querySelector('#sync-status');
              if (newStatus) newStatus.textContent = data.synced + ' 件同期, ' + data.skipped + ' 件スキップ';
            }
          } catch {
            status.textContent = '通信エラー';
            syncBtn.disabled = false;
          }
        }
      });
      document.addEventListener('toggle', function(e) {
        if (!e.target.classList.contains('memory-file') || e.target.open) return;
        e.target.querySelectorAll('.editor-area').forEach(function(ea) {
          if (ea.style.display === 'none') return;
          ea.style.display = 'none';
          const rendered = e.target.querySelector('.markdown[data-rendered="' + ea.dataset.editor + '"]');
          if (rendered) rendered.style.display = 'block';
        });
      }, true);

      document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        detail.querySelectorAll('.editor-area').forEach(function(ea) {
          if (ea.style.display === 'none') return;
          ea.style.display = 'none';
          detail.querySelector('.markdown[data-rendered="' + ea.dataset.editor + '"]').style.display = 'block';
        });
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
