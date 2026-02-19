import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

type ParsedCvPayload = {
  labels: string[];
  experiences: string[];
  skills: string[];
  social?: {
    linkedin?: string;
    facebook?: string;
    youtube?: string;
    github?: string;
  };
  contact: {
    email: string;
    phone: string;
    address?: string;
  };
  additionalInfo?: string;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeParsedCv(raw: unknown, fileName: string): ParsedCvPayload {
  const data =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const labels = normalizeStringArray(data.labels);
  const experiences = normalizeStringArray(data.experiences);
  const skills = normalizeStringArray(data.skills);
  const socialInput =
    typeof data.social === "object" && data.social !== null
      ? (data.social as Record<string, unknown>)
      : undefined;
  const contactInput =
    typeof data.contact === "object" && data.contact !== null
      ? (data.contact as Record<string, unknown>)
      : undefined;

  const social = socialInput
    ? {
        linkedin: normalizeOptionalString(socialInput.linkedin),
        facebook: normalizeOptionalString(socialInput.facebook),
        youtube: normalizeOptionalString(socialInput.youtube),
        github: normalizeOptionalString(socialInput.github),
      }
    : undefined;

  const hasAnySocial = Boolean(
    social?.linkedin || social?.facebook || social?.youtube || social?.github,
  );

  const fallbackLabel = fileName.replace(/\.pdf$/i, "").trim() || "Imported CV";

  return {
    labels: labels.length > 0 ? labels : [fallbackLabel],
    experiences,
    skills,
    social: hasAnySocial ? social : undefined,
    contact: {
      email: normalizeOptionalString(contactInput?.email) ?? "",
      phone: normalizeOptionalString(contactInput?.phone) ?? "",
      address: normalizeOptionalString(contactInput?.address),
    },
    additionalInfo: normalizeOptionalString(data.additionalInfo),
  };
}

async function uploadPdfToOpenAI(args: {
  apiKey: string;
  blob: Blob;
  fileName: string;
}): Promise<string> {
  const formData = new FormData();
  formData.append("purpose", "user_data");
  formData.append("file", args.blob, args.fileName);

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OpenAI file upload failed (${response.status})`);
  }

  const json = (await response.json()) as { id?: string };
  if (!json.id) {
    throw new Error("OpenAI file upload did not return an id");
  }

  return json.id;
}

async function parsePdfWithChatCompletions(args: {
  apiKey: string;
  fileId: string;
}): Promise<unknown> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract CV data from PDF and return valid JSON only. " +
            "JSON keys: labels (string[]), experiences (string[]), skills (string[]), " +
            "social (object with optional linkedin, facebook, youtube, github), " +
            "contact (object with email, phone, optional address), " +
            "additionalInfo (optional string for data that does not fit other fields). " +
            "No markdown, no explanations, no extra keys.",
        },
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                file_id: args.fileId,
              },
            },
            {
              type: "text",
              text:
                "Parse this CV PDF and fill the JSON structure. " +
                "Use empty strings for missing contact.email or contact.phone.",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI chat completion failed (${response.status})`);
  }

  const json = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = json.choices?.[0]?.message?.content;
  const contentText =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .filter((part) => part.type === "text" && typeof part.text === "string")
            .map((part) => part.text)
            .join("\n")
        : "";

  if (!contentText) {
    throw new Error("OpenAI chat completion returned empty content");
  }

  try {
    return JSON.parse(contentText);
  } catch {
    throw new Error("OpenAI chat completion did not return valid JSON");
  }
}

async function deleteOpenAIFile(apiKey: string, fileId: string): Promise<void> {
  await fetch(`https://api.openai.com/v1/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export const parseUploadedPdfToCv = action({
  args: {
    uploadId: v.id("cvUploads"),
  },
  returns: v.object({
    cvId: v.id("cvs"),
  }),
  handler: async (ctx, args): Promise<{ cvId: Id<"cvs"> }> => {
    const upload = await ctx.runQuery(internal.files.getById, {
      uploadId: args.uploadId,
    });

    if (!upload) {
      throw new Error("Upload not found");
    }

    const fileUrl = await ctx.storage.getUrl(upload.storageId);
    if (!fileUrl) {
      throw new Error("Unable to generate URL for uploaded PDF");
    }

    const downloadResponse = await fetch(fileUrl);
    if (!downloadResponse.ok) {
      throw new Error("Unable to read uploaded PDF from storage");
    }

    const fileBlob = await downloadResponse.blob();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    let openAiFileId: string | null = null;

    try {
      openAiFileId = await uploadPdfToOpenAI({
        apiKey,
        blob: fileBlob,
        fileName: upload.fileName,
      });

      const parsedRaw = await parsePdfWithChatCompletions({
        apiKey,
        fileId: openAiFileId,
      });

      const normalized = normalizeParsedCv(parsedRaw, upload.fileName);

      const cvId: Id<"cvs"> = await ctx.runMutation(internal.cvs.createFromParsed, {
        sourceUploadId: args.uploadId,
        labels: normalized.labels,
        experiences: normalized.experiences,
        skills: normalized.skills,
        social: normalized.social,
        contact: normalized.contact,
        additionalInfo: normalized.additionalInfo,
      });

      await ctx.runMutation(internal.files.attachCv, {
        uploadId: args.uploadId,
        cvId,
      });

      return { cvId };
    } finally {
      if (openAiFileId) {
        try {
          await deleteOpenAIFile(apiKey, openAiFileId);
        } catch (error) {
          console.warn("Failed to delete OpenAI temporary file", error);
        }
      }
    }
  },
});
