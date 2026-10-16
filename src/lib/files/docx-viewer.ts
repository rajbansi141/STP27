import zlib from 'node:zlib';

/**
 * Reads a specific entry from a ZIP buffer without external dependencies.
 */
function readZipEntry(buffer: Buffer, targetName: string): Buffer | null {
  let offset = 0;
  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen);
    const dataStart = offset + 30 + nameLen + extraLen;
    const compData = buffer.subarray(dataStart, dataStart + compSize);

    if (name === targetName) {
      if (method === 8) {
        return zlib.inflateRawSync(compData);
      }
      return compData;
    }
    offset = dataStart + compSize;
  }
  return null;
}

/**
 * Escapes HTML entities.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts a DOCX buffer into styled HTML for in-browser preview.
 */
export function convertDocxToPreviewHtml(buffer: Buffer, title: string = 'CV Preview'): string {
  try {
    const xmlBuf = readZipEntry(buffer, 'word/document.xml');
    if (!xmlBuf) {
      return renderStyledHtmlPage(
        title,
        '<div class="notice">Unable to extract document text. Please click "Download" to open in Microsoft Word.</div>'
      );
    }

    const xml = xmlBuf.toString('utf8');

    // Parse paragraphs and tables
    const bodyMatch = xml.match(/<w:body[\s\S]*?<\/w:body>/);
    const contentXml = bodyMatch ? bodyMatch[0] : xml;

    // Match paragraphs and tables
    const elements = contentXml.match(/<(?:w:p|w:tbl)[\s\S]*?<\/(?:w:p|w:tbl)>/g) || [];
    const htmlParts: string[] = [];

    let inList = false;

    for (const elem of elements) {
      if (elem.startsWith('<w:tbl')) {
        // Table rendering
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }

        const rows = elem.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
        let tableHtml = '<div class="table-container"><table class="doc-table"><tbody>';
        for (const row of rows) {
          tableHtml += '<tr>';
          const cells = row.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
          for (const cell of cells) {
            const cellTextMatches = cell.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
            const cellText = cellTextMatches
              .map((t) => t.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
              .join(' ')
              .trim();
            tableHtml += `<td>${escapeHtml(cellText) || '&nbsp;'}</td>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table></div>';
        htmlParts.push(tableHtml);
        continue;
      }

      // Paragraph handling
      const isBullet = /<w:numPr>/i.test(elem);
      const isHeading1 = /Heading1/i.test(elem);
      const isHeading2 = /Heading2/i.test(elem);
      const isHeading3 = /Heading3/i.test(elem);

      const runs = elem.match(/<w:r[\s\S]*?<\/w:r>/g) || [];
      let paragraphContent = '';

      for (const run of runs) {
        const isBold = /<w:b(?:\s*|\/|>)/.test(run);
        const isItalic = /<w:i(?:\s*|\/|>)/.test(run);
        const textMatches = run.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const rawText = textMatches
          .map((t) => t.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
          .join('');

        if (!rawText) continue;
        let formatted = escapeHtml(rawText);
        if (isBold) formatted = `<strong>${formatted}</strong>`;
        if (isItalic) formatted = `<em>${formatted}</em>`;
        paragraphContent += formatted;
      }

      if (!paragraphContent.trim()) {
        continue;
      }

      if (isBullet) {
        if (!inList) {
          htmlParts.push('<ul class="doc-list">');
          inList = true;
        }
        htmlParts.push(`<li>${paragraphContent}</li>`);
      } else {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        if (isHeading1) {
          htmlParts.push(`<h2>${paragraphContent}</h2>`);
        } else if (isHeading2) {
          htmlParts.push(`<h3>${paragraphContent}</h3>`);
        } else if (isHeading3) {
          htmlParts.push(`<h4>${paragraphContent}</h4>`);
        } else {
          htmlParts.push(`<p>${paragraphContent}</p>`);
        }
      }
    }

    if (inList) {
      htmlParts.push('</ul>');
    }

    return renderStyledHtmlPage(title, htmlParts.join('\n'));
  } catch (err) {
    console.error('Error parsing DOCX file for preview:', err);
    return renderStyledHtmlPage(
      title,
      '<div class="notice">An error occurred while rendering the document preview. Please use the Download button to view the original file.</div>'
    );
  }
}

function renderStyledHtmlPage(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f8fafc;
      --paper: #ffffff;
      --text: #1e293b;
      --text-muted: #64748b;
      --primary: #059669;
      --border: #e2e8f0;
      --shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f172a;
        --paper: #1e293b;
        --text: #f1f5f9;
        --text-muted: #94a3b8;
        --primary: #10b981;
        --border: #334155;
        --shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4);
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      line-height: 1.65;
      padding: 24px 16px;
      display: flex;
      justify-content: center;
      min-height: 100vh;
    }
    .paper {
      background: var(--paper);
      max-width: 800px;
      width: 100%;
      padding: 48px 40px;
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
    }
    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--primary);
      background: rgba(16, 185, 129, 0.1);
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 20px;
    }
    h1, h2, h3, h4 {
      color: var(--text);
      font-weight: 700;
      line-height: 1.3;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    h2 { font-size: 1.35rem; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
    h3 { font-size: 1.15rem; color: var(--primary); }
    h4 { font-size: 1rem; }
    p { margin-bottom: 14px; font-size: 0.95rem; color: var(--text); }
    ul.doc-list {
      margin-left: 20px;
      margin-bottom: 16px;
    }
    ul.doc-list li {
      margin-bottom: 6px;
      font-size: 0.95rem;
    }
    strong { font-weight: 600; color: var(--text); }
    .table-container {
      overflow-x: auto;
      margin: 16px 0;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .doc-table td, .doc-table th {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      text-align: left;
    }
    .notice {
      padding: 16px;
      border-radius: 12px;
      background: rgba(234, 179, 8, 0.1);
      color: #b45309;
      font-size: 0.9rem;
      border: 1px solid rgba(234, 179, 8, 0.2);
    }
  </style>
</head>
<body>
  <div class="paper">
    <div class="header-badge">Document Preview</div>
    ${bodyContent}
  </div>
</body>
</html>`;
}
