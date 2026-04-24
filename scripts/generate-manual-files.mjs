import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');

const manuals = [
  {
    input: 'MANUAL_MASTER_PORTARIA_WEB_2026-04-23.md',
    title: 'Manual do Usuário Master - Portaria Web',
  },
  {
    input: 'MANUAL_ADMIN_PORTARIA_WEB_2026-04-23.md',
    title: 'Manual do Usuário Admin - Portaria Web',
  },
  {
    input: 'MANUAL_OPERADOR_PORTARIA_WEB_2026-04-23.md',
    title: 'Manual do Usuário Operador - Portaria Web',
  },
  {
    input: 'MANUAL_MORADOR_PORTARIA_WEB_2026-04-23.md',
    title: 'Manual do Usuário Morador - Portaria Web',
  },
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inlineFormat(text) {
  const imageMatch = text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (imageMatch) {
    const [, alt, src] = imageMatch;
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`;
  }

  let value = escapeHtml(text);
  value = value.replace(/`([^`]+)`/g, '<code>$1</code>');
  value = value.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return value;
}

function markdownToHtml(markdown, title) {
  const lines = markdown.split(/\r?\n/);
  const output = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (inList) {
        output.push('</ul>');
        inList = false;
      }
      continue;
    }

    if (trimmed === '---') {
      if (inList) {
        output.push('</ul>');
        inList = false;
      }
      output.push('<hr />');
      continue;
    }

    if (trimmed.startsWith('### ')) {
      if (inList) {
        output.push('</ul>');
        inList = false;
      }
      output.push(`<h3>${inlineFormat(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      if (inList) {
        output.push('</ul>');
        inList = false;
      }
      output.push(`<h2>${inlineFormat(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith('# ')) {
      if (inList) {
        output.push('</ul>');
        inList = false;
      }
      output.push(`<h1>${inlineFormat(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (/^- /.test(trimmed)) {
      if (!inList) {
        output.push('<ul>');
        inList = true;
      }
      output.push(`<li>${inlineFormat(trimmed.slice(2))}</li>`);
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      if (inList) {
        output.push('</ul>');
        inList = false;
      }
      output.push(`<p class="step">${inlineFormat(trimmed)}</p>`);
      continue;
    }

    output.push(`<p>${inlineFormat(trimmed)}</p>`);
  }

  if (inList) {
    output.push('</ul>');
  }

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        margin: 0;
        background: #f2f5fb;
        color: #172033;
      }
      .page {
        max-width: 980px;
        margin: 0 auto;
        padding: 40px 48px 64px;
        background: #ffffff;
      }
      h1, h2, h3 {
        color: #0f172a;
      }
      h1 {
        font-size: 34px;
        margin-bottom: 10px;
      }
      h2 {
        margin-top: 34px;
        font-size: 24px;
        border-bottom: 1px solid #dbe4f0;
        padding-bottom: 8px;
      }
      h3 {
        margin-top: 26px;
        font-size: 18px;
      }
      p, li {
        font-size: 15px;
        line-height: 1.65;
      }
      .step {
        margin: 8px 0;
      }
      ul {
        padding-left: 20px;
      }
      hr {
        border: 0;
        border-top: 1px solid #dbe4f0;
        margin: 28px 0;
      }
      code {
        background: #eef3f9;
        padding: 2px 6px;
        border-radius: 6px;
        font-family: Consolas, monospace;
      }
      img {
        display: block;
        max-width: 100%;
        margin: 18px auto;
        border: 1px solid #dbe4f0;
        border-radius: 16px;
      }
      @media print {
        body {
          background: #ffffff;
        }
        .page {
          max-width: none;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      ${output.join('\n')}
    </main>
  </body>
</html>`;
}

function markdownToRtf(markdown, title) {
  const rtfBody = markdown
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => {
      let current = line
        .replace(/\\/g, '\\\\')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\t/g, '\\tab ');

      current = current.replace(/[^\x00-\x7F]/g, (char) => `\\u${char.charCodeAt(0)}?`);

      if (current.startsWith('# ')) return `\\b\\fs32 ${current.slice(2)}\\b0\\fs24\\par`;
      if (current.startsWith('## ')) return `\\b\\fs28 ${current.slice(3)}\\b0\\fs24\\par`;
      if (current.startsWith('### ')) return `\\b\\fs25 ${current.slice(4)}\\b0\\fs24\\par`;
      if (/^\d+\.\s/.test(current)) return `${current}\\par`;
      if (/^- /.test(current)) return `\\bullet\\tab ${current.slice(2)}\\par`;
      if (current === '---') return '\\par';
      if (!current.trim()) return '\\par';
      return `${current}\\par`;
    })
    .join('\n');

  return `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Segoe UI;}{\\f1 Consolas;}}
\\fs24
\\b ${title.replace(/[^\x00-\x7F]/g, (char) => `\\u${char.charCodeAt(0)}?`)}\\b0\\par
\\par
${rtfBody}
}`;
}

for (const manual of manuals) {
  const markdownPath = path.join(docsDir, manual.input);
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const html = markdownToHtml(markdown, manual.title);
  const rtf = markdownToRtf(markdown, manual.title);

  const baseName = manual.input.replace(/\.md$/i, '');
  fs.writeFileSync(path.join(docsDir, `${baseName}.html`), html, 'utf8');
  fs.writeFileSync(path.join(docsDir, `${baseName}.rtf`), rtf, 'utf8');
}
