const { marked } = require('marked');
const { layout, escapeHtml } = require('./layout');

function sessionPage(s) {
  const messages = s.messages.map(m => `
    <div class="message message--${m.role}">
      <div class="message-role">${m.role === 'user' ? 'User' : 'Assistant'}</div>
      <div class="message-body markdown">${marked(m.text)}</div>
    </div>
  `).join('');

  const content = `
    <div class="session-page">
      <div class="session-header">
        <div class="session-title">${escapeHtml(s.title)}</div>
        <div class="session-meta">${s.cwd ? escapeHtml(s.cwd) + ' · ' : ''}${s.date ? new Date(s.date).toLocaleString('ja-JP') : ''}</div>
      </div>
      <div class="session-messages">${messages || '<p class="muted">メッセージなし</p>'}</div>
    </div>
  `;

  return layout(s.title, content);
}

module.exports = { sessionPage };
