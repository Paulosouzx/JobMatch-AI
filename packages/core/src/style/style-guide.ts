export interface StyleGuide {
  rules: string[];
  bannedPhrases: string[];
  samples: string[];
}

export const DEFAULT_STYLE_GUIDE: StyleGuide = {
  rules: [
    'Use short, direct sentences.',
    'Use concrete verbs (built, reduced, migrated, shipped) instead of vague ones.',
    'Keep real numbers when the source text has them. Never add numbers that are not in the source.',
    'No filler, no flourish, no closing sentence that repeats everything.',
    'Cover letters have at most 3 short paragraphs.',
    'Never use the em dash (—) or the en dash (–) inside sentences. Use a comma, a full stop or parentheses instead.',
  ],
  bannedPhrases: [
    'apaixonado por',
    'apaixonada por',
    'dinâmico',
    'dinâmica',
    'sinergia',
    'alavancar',
    'robusto',
    'robusta',
    'inovador',
    'inovadora',
    'jornada',
    'mergulhar',
    'no cenário atual',
    'em constante evolução',
    'além disso',
    'é importante ressaltar',
    'não apenas... mas também',
    'desbloquear',
    'potencializar',
    'passionate',
    'leverage',
    'delve',
    'seamless',
    'cutting-edge',
    'spearheaded',
  ],
  samples: [],
};

function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function phrasePattern(phrase: string): RegExp {
  const parts = fold(phrase.trim())
    .split(/\s*(?:\.\.\.|…)\s*/)
    .filter(Boolean)
    .map((part) => escapeRegExp(part).replace(/\s+/g, '\\s+'));
  const body = parts.join('[\\s\\S]{1,80}?');
  return new RegExp(`(^|[^\\p{L}\\p{N}])(${body})(?=$|[^\\p{L}\\p{N}])`, 'giu');
}

export interface BannedHit {
  phrase: string;
  start: number;
  end: number;
  match: string;
}

export function findBannedPhrases(text: string, phrases: string[]): BannedHit[] {
  const folded = fold(text);
  const hits: BannedHit[] = [];
  for (const phrase of phrases) {
    if (phrase.trim() === '') continue;
    for (const match of folded.matchAll(phrasePattern(phrase))) {
      const start = (match.index ?? 0) + (match[1]?.length ?? 0);
      const end = start + (match[2]?.length ?? 0);
      hits.push({ phrase, start, end, match: text.slice(start, end) });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

export function replaceDashes(text: string): string {
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2')
    .replace(/\s*[—–]\s*([.,;:!?])/g, '$1')
    .replace(/(^|\n)\s*[—–]\s*/g, '$1')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/[ \t]{2,}/g, ' ');
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9"“(])|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function sentencesWithBannedPhrases(text: string, phrases: string[]): string[] {
  return splitSentences(text).filter((sentence) => findBannedPhrases(sentence, phrases).length > 0);
}

export function formatStyleGuide(guide: StyleGuide): string {
  const lines = ['Writing rules:', ...guide.rules.map((rule) => `- ${rule}`)];
  if (guide.bannedPhrases.length > 0) {
    lines.push(
      '',
      `Never use these words or expressions (in any language or inflection): ${guide.bannedPhrases.join('; ')}.`,
    );
  }
  const samples = guide.samples
    .map((sample) => sample.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (samples.length > 0) {
    lines.push(
      '',
      'Match the tone of these texts written by the candidate (tone only, do not copy content):',
    );
    samples.forEach((sample, index) =>
      lines.push(`<sample ${index + 1}>`, sample.slice(0, 1500), `</sample ${index + 1}>`),
    );
  }
  return lines.join('\n');
}
