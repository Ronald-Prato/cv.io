import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DEFAULT_LANGUAGE,
  resources,
  type AppLanguage,
} from "@/lib/i18n/resources";

type RequestMessage = {
  role: "assistant" | "user" | "system";
  content: string;
};

type ChatRequestBody = {
  cvId?: string;
  locale?: string;
  messages?: RequestMessage[];
};

type ToolCall = {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: ToolCall[];
    };
  }>;
};

type UpdateCvToolArgs = {
  cvId: string;
  labelsToAdd?: string[];
  labelsToRemove?: string[];
  experiencesToAdd?: string[];
  experiencesToRemove?: string[];
  skillsToAdd?: string[];
  skillsToRemove?: string[];
  additionalInfoToAdd?: string[];
  additionalInfoToRemove?: string[];
  additionalInfo?: string;
  social?: {
    linkedin?: string | null;
    facebook?: string | null;
    youtube?: string | null;
    github?: string | null;
  };
  contact?: {
    email?: string;
    phone?: string;
    address?: string | null;
  };
};

type GetCvUpdatePromptToolArgs = {
  cvId: string;
  locale?: "es" | "en";
  sectionHint?: string;
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

function buildSystemPrompt(locale: AppLanguage): string {
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
    "To access CV data, use the tool get_cv_by_id.",
    "Before any CV update, call get_cv_update_prompt to gather follow-up questions and enrichment guidance.",
    "To modify CV data, use the tool update_cv_by_id.",
    "Call get_cv_by_id only when the user asks for CV-specific data or analysis that requires reading the CV.",
    "Call update_cv_by_id when the user asks to add, remove, or edit CV fields (experiences, skills, labels, contact, social, additionalInfo).",
    "When information is incomplete or could be enriched, ask follow-up questions first and wait for the user response before calling update_cv_by_id.",
    "Use additionalInfo for fields that do not fit the schema (for example: secondaryEmail: abc@gmail.com).",
    "Never modify createdAt. updatedAt must be managed by backend automatically.",
    "Do not call tools for greetings, small talk, or generic writing advice.",
    "Do not assume CV data from hidden context and do not invent CV fields.",
    "If key data is missing, state the limitation briefly and ask a focused follow-up question.",
    "Be concise, practical, and specific.",
  ].join("\n");
}

function getLastUserMessage(messages: RequestMessage[]): string {
  return [...messages]
    .reverse()
    .find((message) => message.role === "user")
    ?.content.trim() ?? "";
}

function shouldEnableCvTool(lastUserMessage: string): boolean {
  const text = lastUserMessage.toLowerCase().trim();
  if (!text) return false;

  const greetingOnlyPattern =
    /^(hola+|hello+|hi+|hey+|buenas|qué tal|que tal|gracias+|thanks+|ok+|vale|perfecto+|buen[o|a]s?)\W*$/i;
  if (greetingOnlyPattern.test(text)) {
    return false;
  }

  const cvKeywords = [
    "cv",
    "curriculum",
    "currículum",
    "resume",
    "résumé",
    "experiencia",
    "experiencias",
    "skills",
    "habilidades",
    "perfil",
  ];
  if (cvKeywords.some((keyword) => text.includes(keyword))) {
    return true;
  }

  const analysisKeywords = [
    "analiza",
    "analizar",
    "mejora",
    "mejorar",
    "optimiza",
    "optimizar",
    "adapta",
    "adaptar",
    "revisa",
    "evalua",
    "evalúa",
    "opina",
    "agrega",
    "agregar",
    "añade",
    "anade",
    "quita",
    "quitar",
    "elimina",
    "eliminar",
    "actualiza",
    "actualizar",
    "edita",
    "editar",
    "cambia",
    "cambiar",
  ];

  if (
    analysisKeywords.some((keyword) => text.includes(keyword)) &&
    text.length >= 16
  ) {
    return true;
  }

  return false;
}

async function createStreamingOpenAIResponse(params: {
  openAiApiKey: string;
  systemPrompt: string;
  messages: RequestMessage[];
}): Promise<Response> {
  const openAiResponse = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.openAiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: params.systemPrompt,
        },
        ...params.messages,
      ],
    }),
  });

  if (!openAiResponse.ok) {
    throw openAiResponse;
  }

  const stream = streamTokensFromOpenAI(openAiResponse);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
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

function buildToolLogLine(locale: AppLanguage, toolName: string): string {
  return locale === "es"
    ? `> Se llamó a la herramienta \`${toolName}\`.\n\n`
    : `> Called tool \`${toolName}\`.\n\n`;
}

function parseToolCvId(rawArgs: string, fallbackCvId: string): string {
  const convexIdPattern = /^[0-9a-z]{24,}$/;

  try {
    const parsed = JSON.parse(rawArgs) as { cvId?: unknown };
    if (typeof parsed.cvId === "string") {
      const candidate = parsed.cvId.trim();
      if (convexIdPattern.test(candidate)) {
        return candidate;
      }
    }
  } catch {
    // Ignore malformed JSON and use fallback cvId.
  }

  return fallbackCvId;
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore malformed JSON.
  }
  return {};
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  return result.length ? result : undefined;
}

function parseUpdateCvToolArgs(
  rawArgs: string,
  fallbackCvId: string
): UpdateCvToolArgs {
  const parsed = parseJsonObject(rawArgs);

  const social =
    parsed.social && typeof parsed.social === "object" && !Array.isArray(parsed.social)
      ? (parsed.social as Record<string, unknown>)
      : undefined;
  const contact =
    parsed.contact && typeof parsed.contact === "object" && !Array.isArray(parsed.contact)
      ? (parsed.contact as Record<string, unknown>)
      : undefined;

  const result: UpdateCvToolArgs = {
    cvId: parseToolCvId(rawArgs, fallbackCvId),
    labelsToAdd: asStringArray(parsed.labelsToAdd),
    labelsToRemove: asStringArray(parsed.labelsToRemove),
    experiencesToAdd: asStringArray(parsed.experiencesToAdd),
    experiencesToRemove: asStringArray(parsed.experiencesToRemove),
    skillsToAdd: asStringArray(parsed.skillsToAdd),
    skillsToRemove: asStringArray(parsed.skillsToRemove),
    additionalInfoToAdd: asStringArray(parsed.additionalInfoToAdd),
    additionalInfoToRemove: asStringArray(parsed.additionalInfoToRemove),
  };

  if (typeof parsed.additionalInfo === "string") {
    result.additionalInfo = parsed.additionalInfo;
  }

  if (social) {
    const socialPatch: NonNullable<UpdateCvToolArgs["social"]> = {};
    for (const key of ["linkedin", "facebook", "youtube", "github"] as const) {
      const value = social[key];
      if (typeof value === "string") socialPatch[key] = value;
      if (value === null) socialPatch[key] = null;
    }
    if (Object.keys(socialPatch).length) result.social = socialPatch;
  }

  if (contact) {
    const contactPatch: NonNullable<UpdateCvToolArgs["contact"]> = {};
    if (typeof contact.email === "string") contactPatch.email = contact.email;
    if (typeof contact.phone === "string") contactPatch.phone = contact.phone;
    if (typeof contact.address === "string") contactPatch.address = contact.address;
    if (contact.address === null) contactPatch.address = null;
    if (Object.keys(contactPatch).length) result.contact = contactPatch;
  }

  return result;
}

function parseGetCvUpdatePromptToolArgs(
  rawArgs: string,
  fallbackCvId: string,
  fallbackLocale: AppLanguage
): GetCvUpdatePromptToolArgs {
  const parsed = parseJsonObject(rawArgs);
  const locale = parsed.locale === "es" || parsed.locale === "en" ? parsed.locale : fallbackLocale;
  const sectionHint =
    typeof parsed.sectionHint === "string" && parsed.sectionHint.trim().length > 0
      ? parsed.sectionHint.trim()
      : undefined;

  return {
    cvId: parseToolCvId(rawArgs, fallbackCvId),
    locale,
    sectionHint,
  };
}

function isCvNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("cv not found");
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
    const systemPrompt = [
      buildSystemPrompt(locale),
      `Current CV id: ${body.cvId}. Use this id when calling get_cv_by_id or update_cv_by_id unless the user asks for a different CV.`,
    ].join("\n");
    const lastUserMessage = getLastUserMessage(messages);
    const shouldUseTools = shouldEnableCvTool(lastUserMessage);

    if (!shouldUseTools) {
      try {
        return await createStreamingOpenAIResponse({
          openAiApiKey,
          systemPrompt,
          messages,
        });
      } catch (error) {
        const openAiError = await readOpenAIError(error as Response);
        const errorMessage = openAiError
          ? `${dict.chatFailedUnexpected} ${openAiError}`
          : dict.chatFailedUnexpected;
        return jsonError((error as Response).status ?? 500, errorMessage);
      }
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "get_cv_by_id",
          description: "Fetch a CV document by its Convex id.",
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              cvId: {
                type: "string",
                description: "Convex id of the cv document.",
              },
            },
            required: ["cvId"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "update_cv_by_id",
          description:
            "Update CV fields. Supports add/remove operations for arrays and partial updates for contact/social/additionalInfo. createdAt must never be modified.",
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              cvId: {
                type: "string",
                description: "Convex id of the cv document.",
              },
              labelsToAdd: {
                type: "array",
                items: { type: "string" },
              },
              labelsToRemove: {
                type: "array",
                items: { type: "string" },
              },
              experiencesToAdd: {
                type: "array",
                items: { type: "string" },
              },
              experiencesToRemove: {
                type: "array",
                items: { type: "string" },
              },
              skillsToAdd: {
                type: "array",
                items: { type: "string" },
              },
              skillsToRemove: {
                type: "array",
                items: { type: "string" },
              },
              additionalInfoToAdd: {
                type: "array",
                items: { type: "string" },
                description:
                  "Plain text entries for extra data outside schema, e.g. secondaryEmail: abc@gmail.com",
              },
              additionalInfoToRemove: {
                type: "array",
                items: { type: "string" },
                description:
                  "Remove exact plain text entries previously stored in additionalInfo.",
              },
              additionalInfo: {
                type: "string",
                description:
                  "Optional full replacement for additionalInfo plain text (can include multiple lines).",
              },
              social: {
                type: "object",
                additionalProperties: false,
                properties: {
                  linkedin: { type: ["string", "null"] },
                  facebook: { type: ["string", "null"] },
                  youtube: { type: ["string", "null"] },
                  github: { type: ["string", "null"] },
                },
              },
              contact: {
                type: "object",
                additionalProperties: false,
                properties: {
                  email: { type: "string" },
                  phone: { type: "string" },
                  address: { type: ["string", "null"] },
                },
              },
            },
            required: ["cvId"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_cv_update_prompt",
          description:
            "Return follow-up questions and guidance to enrich data before updating a CV.",
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              cvId: {
                type: "string",
                description: "Convex id of the cv document.",
              },
              locale: {
                type: "string",
                enum: ["es", "en"],
                description: "Language for follow-up questions.",
              },
              sectionHint: {
                type: "string",
                description: "Optional section/topic being updated (skill, experience, contact, etc).",
              },
            },
            required: ["cvId"],
          },
        },
      },
    ];

    const planningResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        tools,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messages,
        ],
      }),
    });

    if (!planningResponse.ok) {
      const openAiError = await readOpenAIError(planningResponse);
      const errorMessage = openAiError
        ? `${dict.chatFailedUnexpected} ${openAiError}`
        : dict.chatFailedUnexpected;
      return jsonError(planningResponse.status, errorMessage);
    }

    const planningPayload = (await planningResponse.json()) as ChatCompletionResponse;
    const message = planningPayload.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.find(
      (call) =>
        call.function?.name === "get_cv_by_id" ||
        call.function?.name === "update_cv_by_id" ||
        call.function?.name === "get_cv_update_prompt"
    );

    if (!toolCall) {
      try {
        return await createStreamingOpenAIResponse({
          openAiApiKey,
          systemPrompt,
          messages,
        });
      } catch (error) {
        const openAiError = await readOpenAIError(error as Response);
        const errorMessage = openAiError
          ? `${dict.chatFailedUnexpected} ${openAiError}`
          : dict.chatFailedUnexpected;
        return jsonError((error as Response).status ?? 500, errorMessage);
      }
    }

    let toolArgsForOpenAI: Record<string, unknown>;
    let toolResult: unknown;

    if (toolCall.function.name === "update_cv_by_id") {
      const updateArgs = parseUpdateCvToolArgs(toolCall.function.arguments, body.cvId);
      toolArgsForOpenAI = updateArgs;
      try {
        toolResult = await convex.mutation(api.cvs.updateById, {
          cvId: updateArgs.cvId as Id<"cvs">,
          labelsToAdd: updateArgs.labelsToAdd,
          labelsToRemove: updateArgs.labelsToRemove,
          experiencesToAdd: updateArgs.experiencesToAdd,
          experiencesToRemove: updateArgs.experiencesToRemove,
          skillsToAdd: updateArgs.skillsToAdd,
          skillsToRemove: updateArgs.skillsToRemove,
          additionalInfoToAdd: updateArgs.additionalInfoToAdd,
          additionalInfoToRemove: updateArgs.additionalInfoToRemove,
          additionalInfo: updateArgs.additionalInfo,
          social: updateArgs.social,
          contact: updateArgs.contact,
        });
      } catch (error) {
        if (isCvNotFoundError(error)) {
          return jsonError(404, dict.chatCvNotFound);
        }
        return jsonError(500, dict.chatFailedUnexpected);
      }
    } else if (toolCall.function.name === "get_cv_update_prompt") {
      const promptArgs = parseGetCvUpdatePromptToolArgs(
        toolCall.function.arguments,
        body.cvId,
        locale
      );
      toolArgsForOpenAI = promptArgs;
      try {
        toolResult = await convex.query(api.cvs.getUpdatePrompt, {
          cvId: promptArgs.cvId as Id<"cvs">,
          locale: promptArgs.locale,
          sectionHint: promptArgs.sectionHint,
        });
      } catch (error) {
        if (isCvNotFoundError(error)) {
          return jsonError(404, dict.chatCvNotFound);
        }
        return jsonError(500, dict.chatFailedUnexpected);
      }
    } else {
      const requestedCvId = parseToolCvId(toolCall.function.arguments, body.cvId);
      toolArgsForOpenAI = { cvId: requestedCvId };
      try {
        toolResult = await convex.query(api.cvs.getById, {
          cvId: requestedCvId as Id<"cvs">,
        });
      } catch (error) {
        // Fallback for invalid-id validation or undeployed getById function.
        const cvs = await convex.query(api.cvs.listAll, {});
        toolResult = cvs.find((item) => String(item._id) === requestedCvId);

        if (!toolResult) {
          if (isCvNotFoundError(error)) {
            return jsonError(404, dict.chatCvNotFound);
          }
          return jsonError(404, dict.chatCvNotFound);
        }
      }
    }

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
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: toolCall.id,
                type: "function",
                function: {
                  name: toolCall.function.name,
                  arguments: JSON.stringify(toolArgsForOpenAI),
                },
              },
            ],
          },
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          },
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

    const modelStream = streamTokensFromOpenAI(openAiResponse);
    const encoder = new TextEncoder();
    const toolLogLine = buildToolLogLine(locale, toolCall.function.name);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(toolLogLine));
        const reader = modelStream.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            controller.enqueue(value);
          }
        }

        controller.close();
      },
    });

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
