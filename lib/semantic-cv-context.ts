type CvSocial = {
  linkedin?: string;
  facebook?: string;
  youtube?: string;
  github?: string;
};

type CvContact = {
  email: string;
  phone: string;
  address?: string;
};

export type CvForSemanticContext = {
  labels: string[];
  experiences: string[];
  skills: string[];
  social?: CvSocial;
  contact: CvContact;
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
  const chunks: ContextChunk[] = [
    {
      label: "Labels",
      content: cv.labels.join(", "),
    },
    {
      label: "Skills",
      content: cv.skills.join(", "),
    },
  ];

  cv.experiences.forEach((experience, index) => {
    chunks.push({
      label: `Experience ${index + 1}`,
      content: experience,
    });
  });

  if (cv.social) {
    const socialText = [
      cv.social.linkedin ? `LinkedIn: ${cv.social.linkedin}` : null,
      cv.social.github ? `GitHub: ${cv.social.github}` : null,
      cv.social.facebook ? `Facebook: ${cv.social.facebook}` : null,
      cv.social.youtube ? `YouTube: ${cv.social.youtube}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    if (socialText) {
      chunks.push({
        label: "Social",
        content: socialText,
      });
    }
  }

  chunks.push({
    label: "Contact",
    content: [
      `Email: ${cv.contact.email}`,
      `Phone: ${cv.contact.phone}`,
      cv.contact.address ? `Address: ${cv.contact.address}` : null,
    ]
      .filter(Boolean)
      .join(", "),
  });

  return chunks;
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
