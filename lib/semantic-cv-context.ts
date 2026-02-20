export type CvForSemanticContext = {
  description: string;
};

type ContextChunk = {
  label: string;
  content: string;
};

const STOP_WORDS = new Set([
  "a",
  "al",
  "and",
  "con",
  "de",
  "del",
  "el",
  "en",
  "for",
  "la",
  "los",
  "para",
  "por",
  "que",
  "the",
  "to",
  "un",
  "una",
  "y",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function toChunks(cv: CvForSemanticContext): ContextChunk[] {
  const lines = cv.description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [{ label: "Description", content: cv.description.trim() }];
  }

  return lines.map((line, index) => ({
    label: `Description ${index + 1}`,
    content: line,
  }));
}

function chunkScore(chunk: ContextChunk, queryTokens: Set<string>) {
  if (queryTokens.size === 0) return 1;

  const chunkTokens = new Set(tokenize(chunk.content));
  let overlap = 0;

  queryTokens.forEach((token) => {
    if (chunkTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / queryTokens.size;
}

export function buildSemanticCvContext(
  cv: CvForSemanticContext,
  query: string,
  maxChunks = 6
): string {
  const chunks = toChunks(cv);
  const queryTokens = new Set(tokenize(query));

  return chunks
    .map((chunk) => ({
      chunk,
      score: chunkScore(chunk, queryTokens),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map(({ chunk }, index) => `[${index + 1}] ${chunk.label}: ${chunk.content}`)
    .join("\n");
}
