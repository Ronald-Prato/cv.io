import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";
import {
  DEFAULT_LANGUAGE,
  resources,
  type AppLanguage,
} from "@/lib/i18n/resources";
import {
  buildSemanticCvContext,
  type CvForSemanticContext,
} from "@/lib/semantic-cv-context";

type RequestMessage = {
  role: "assistant" | "user" | "system";
  content: string;
};

type ChatRequestBody = {
  cvId?: string;
  locale?: string;
  messages?: RequestMessage[];
};

type RawCv = {
  labels?: unknown;
  experiences?: unknown;
  skills?: unknown;
  social?: unknown;
  contact?: unknown;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function parseLocale(value?: string): AppLanguage {
  if (!value) return DEFAULT_LANGUAGE;
  return value.toLowerCase().startsWith("es") ? "es" : "en";
}

function getDictionary(locale: AppLanguage) {
  return resources[locale].translation.home;
}

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

function sanitizeMessages(input: unknown): RequestMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((item): item is RequestMessage => {
      if (!item || typeof item !== "object") return false;

      const role = (item as { role?: unknown }).role;
      const content = (item as { content?: unknown }).content;

      const validRole =
        role === "assistant" || role === "user" || role === "system";

      return validRole && typeof content === "string";
    })
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }))
    .filter((item) => Boolean(item.content));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapCvToContext(cv: RawCv): CvForSemanticContext {
  const rawSocial =
    cv.social && typeof cv.social === "object" ? (cv.social as Record<string, unknown>) : undefined;
  const rawContact =
    cv.contact && typeof cv.contact === "object"
      ? (cv.contact as Record<string, unknown>)
      : {};

  return {
    labels: asStringArray(cv.labels),
    experiences: asStringArray(cv.experiences),
    skills: asStringArray(cv.skills),
    social: rawSocial
      ? {
          linkedin:
            typeof rawSocial.linkedin === "string" ? rawSocial.linkedin : undefined,
          facebook:
            typeof rawSocial.facebook === "string" ? rawSocial.facebook : undefined,
          youtube: typeof rawSocial.youtube === "string" ? rawSocial.youtube : undefined,
          github: typeof rawSocial.github === "string" ? rawSocial.github : undefined,
        }
      : undefined,
    contact: {
      email: typeof rawContact.email === "string" ? rawContact.email : "",
      phone: typeof rawContact.phone === "string" ? rawContact.phone : "",
      address: typeof rawContact.address === "string" ? rawContact.address : undefined,
    },
  };
}

function buildSystemPrompt(locale: AppLanguage, cvContext: string): string {
  const languageInstruction = locale === "es" ? "español" : "English";

  return [
    "You are cv.io, an assistant that helps users improve and adapt CVs.",
    `Always answer in ${languageInstruction}.`,
    "Always format your response in GitHub-flavored Markdown (.md).",
    "Never wrap your entire response in triple backticks.",
    "Use markdown headings, bold/italic emphasis, tables, and fenced code blocks when useful.",
    "When presenting tabular data, use valid GFM tables (header + separator + rows) and never ASCII-art tables.",
    "Do not place markdown tables inside code blocks.",
    "If you add commentary before or after a table, separate it with a blank line and keep it outside table rows.",
    "Do not use HTML tags like <br>; use plain Markdown line breaks and paragraphs.",
    "For JSON snippets, use fenced blocks with language identifier json.",
    "Use the semantic context as source of truth for this CV.",
    "If key data is missing, state the limitation briefly and ask a focused follow-up question.",
    "Be concise, practical, and specific.",
    "",
    "Semantic CV context:",
    cvContext,
  ].join("\n");
}

async function readOpenAIError(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string };
    };
    return payload.error?.message ?? null;
  } catch {
    return null;
  }
}

function streamTokensFromOpenAI(openAiResponse: Response): ReadableStream<Uint8Array> {
  const source = openAiResponse.body;
  if (!source) {
    throw new Error("Missing OpenAI response stream body");
  }

  const reader = source.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      const separatorPattern = /\r?\n\r?\n/;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        let match = buffer.match(separatorPattern);

        while (match && match.index !== undefined) {
          const idx = match.index;
          const len = match[0].length;
          const event = buffer.slice(0, idx);
          buffer = buffer.slice(idx + len);

          const dataLines = event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s*/, "").trim());

          for (const line of dataLines) {
            if (!line) continue;

            if (line === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const payload = JSON.parse(line) as {
                choices?: Array<{
                  delta?: { content?: string };
                }>;
              };

              const token = payload.choices?.[0]?.delta?.content;
              if (token) {
                controller.enqueue(encoder.encode(token));
              }
            } catch {
              // Ignore malformed chunks to keep the stream alive.
            }
          }

          match = buffer.match(separatorPattern);
        }
      }
    },
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ChatRequestBody | null;
  const locale = parseLocale(body?.locale);
  const dict = getDictionary(locale);

  if (!body?.cvId || typeof body.cvId !== "string") {
    return jsonError(400, dict.chatInvalidRequest);
  }

  const messages = sanitizeMessages(body.messages);
  if (messages.length === 0) {
    return jsonError(400, dict.chatInvalidRequest);
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return jsonError(500, dict.chatFailedUnexpected);
  }

  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    return jsonError(500, dict.chatMissingApiKey);
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const cvs = await convex.query(api.cvs.listAll, {});
    const cv = cvs.find((item) => String(item._id) === body.cvId);

    if (!cv) {
      return jsonError(404, dict.chatCvNotFound);
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user")?.content;

    const cvContext = buildSemanticCvContext(
      mapCvToContext(cv),
      lastUserMessage ?? ""
    );
    const systemPrompt = buildSystemPrompt(locale, cvContext);

    const openAiResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messages,
        ],
      }),
    });

    if (!openAiResponse.ok) {
      const openAiError = await readOpenAIError(openAiResponse);
      const errorMessage = openAiError
        ? `${dict.chatFailedUnexpected} ${openAiError}`
        : dict.chatFailedUnexpected;
      return jsonError(openAiResponse.status, errorMessage);
    }

    const stream = streamTokensFromOpenAI(openAiResponse);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch {
    return jsonError(500, dict.chatFailedUnexpected);
  }
}
