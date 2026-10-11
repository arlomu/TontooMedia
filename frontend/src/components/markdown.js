// Mini-Markdown für Posts (Demo, keine Dependency):
// `code`, **fett**, *kursiv*, ~~durch~~, [text](url), #tags,
// "- " Listen, "> " Zitate, Zeilenumbrüche. Gibt HTML zurück (escapet).
const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/(^|[\s(])#([a-zA-Z0-9äöüÄÖÜß_]{2,30})/g, '$1<span class="md-tag">#$2</span>')

export function renderMarkdown(text = '') {
  const lines = String(text).split('\n')
  let html = ''
  let list = []
  const flushList = () => {
    if (list.length) {
      html += `<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`
      list = []
    }
  }
  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith('- ') && t.length > 2) {
      list.push(t.slice(2))
    } else {
      flushList()
      if (!t) {
        html += '<br/>'
      } else if (t.startsWith('> ') && t.length > 2) {
        html += `<blockquote>${inline(t.slice(2))}</blockquote>`
      } else {
        html += `<p>${inline(line)}</p>`
      }
    }
  }
  flushList()
  return html
}
