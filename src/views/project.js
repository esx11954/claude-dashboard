const { marked } = require('marked');
const { layout, escapeHtml } = require('./layout');

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('ja-JP');
}

function projectContent(p) {
  const memorySection = p.memoryIndex ? `
    <section class="section">
      <h2>メモリ</h2>
      <div class="markdown">${marked(p.memoryIndex)}</div>
      ${p.memoryFiles.map(f => `
        <details class="memory-file">
          <summary>
            ${escapeHtml(f.name)}<span class="memory-ts">${formatDate(f.mtime)}</span>
            <button class="edit-btn" data-project="${escapeHtml(encodeURIComponent(p.dirName))}" data-filename="${escapeHtml(f.filename)}">編集</button>
          </summary>
          <div class="markdown" data-rendered="${escapeHtml(f.filename)}">${marked(f.content)}</div>
          <div class="editor-area" data-editor="${escapeHtml(f.filename)}" style="display:none">
            <textarea class="editor-textarea" rows="16"></textarea>
            <div class="editor-actions">
              <button class="save-btn" data-project="${escapeHtml(encodeURIComponent(p.dirName))}" data-filename="${escapeHtml(f.filename)}">保存</button>
              <button class="cancel-btn" data-filename="${escapeHtml(f.filename)}">キャンセル</button>
            </div>
          </div>
        </details>
      `).join('')}
    </section>
  ` : `<section class="section"><p class="muted">メモリなし</p></section>`;

  const sessionRows = p.sessions.map(s => `
    <tr class="session-row" data-project="${escapeHtml(encodeURIComponent(p.dirName))}" data-session="${escapeHtml(encodeURIComponent(s.id))}">
      <td>${escapeHtml(s.title)}</td>
      <td>${formatDate(s.date)}</td>
      <td class="turns">${s.turnCount} ターン</td>
    </tr>
  `).join('');

  const sessionScript = '';

  const sessionSection = `
    <section class="section">
      <h2>セッション履歴</h2>
      ${p.sessions.length === 0 ? '<p class="muted">セッションなし</p>' : `
        <table>
          <thead><tr><th>タイトル</th><th>日時</th><th>ターン数</th></tr></thead>
          <tbody>${sessionRows}</tbody>
        </table>
      `}
    </section>
  `;

  return `
    <div class="detail-header">
      <div class="detail-cwd">${escapeHtml(p.cwd)}</div>
      <span class="count">${p.sessionCount} セッション</span>
      <button class="launch-btn" data-project="${escapeHtml(encodeURIComponent(p.dirName))}">セッション開始</button>
    </div>
    ${memorySection}
    ${sessionSection}
    ${sessionScript}
  `;
}

function projectDetail(p, partial = false) {
  const content = projectContent(p);
  if (partial) return content;
  return layout(p.cwd, `
    <div class="app">
      <div class="detail-pane" id="detail">${content}</div>
    </div>
  `);
}

module.exports = { projectDetail };
