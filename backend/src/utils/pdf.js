function wrapText(text, width = 92) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .flatMap((line) => {
      if (!line.trim()) return [''];

      const words = line.split(/\s+/);
      const lines = [];
      let current = '';

      for (const word of words) {
        if ((current + ' ' + word).trim().length > width) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = `${current} ${word}`.trim();
        }
      }

      if (current) lines.push(current);
      return lines;
    });
}

function toUtf16BeHex(text) {
  const littleEndian = Buffer.from(String(text), 'utf16le');
  const bigEndian = Buffer.alloc(littleEndian.length);

  for (let index = 0; index < littleEndian.length; index += 2) {
    bigEndian[index] = littleEndian[index + 1];
    bigEndian[index + 1] = littleEndian[index];
  }

  return `<FEFF${bigEndian.toString('hex').toUpperCase()}>`;
}

function buildContentStream(lines) {
  const commands = [
    'BT',
    '/F1 11 Tf',
    '50 790 Td',
    '16 TL',
  ];

  lines.forEach((line, index) => {
    if (index > 0) commands.push('T*');
    commands.push(`${toUtf16BeHex(line)} Tj`);
  });

  commands.push('ET');
  return commands.join('\n');
}

export function createResumePdfBuffer({ title, resumeText }) {
  const headerLines = [
    title || 'Curriculo do candidato',
    `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
    '',
  ];
  const allLines = [...headerLines, ...wrapText(resumeText)];
  const pageSize = 45;
  const pages = [];

  for (let index = 0; index < allLines.length; index += pageSize) {
    pages.push(allLines.slice(index, index + pageSize));
  }

  if (pages.length === 0) pages.push(['Curriculo nao informado.']);

  const fontObjectId = 3;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '',
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
  ];

  const pageRefs = [];

  pages.forEach((lines, index) => {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const content = buildContentStream(lines);

    pageRefs.push(`${pageObjectId} 0 R`);
    objects.push(
      `${pageObjectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>\nendobj`,
    );
    objects.push(
      `${contentObjectId} 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj`,
    );
  });

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>\nendobj`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}
