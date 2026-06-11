export function parseJsonFromText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty AI response');
  }

  const normalized = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(normalized);
  } catch {
    const objectStart = normalized.indexOf('{');
    const arrayStart = normalized.indexOf('[');
    const startCandidates = [objectStart, arrayStart].filter((index) => index >= 0);
    const start = Math.min(...startCandidates);
    const end = Math.max(normalized.lastIndexOf('}'), normalized.lastIndexOf(']'));

    if (Number.isFinite(start) && start >= 0 && end > start) {
      return JSON.parse(normalized.slice(start, end + 1));
    }

    throw new Error('AI response is not valid JSON');
  }
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [value];
}

export function clampNumber(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.round(number), min), max);
}
