import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

function normalizeMarkdown(value: string, fileName: string): string {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (normalized.length > 0) return normalized;

  const title = fileName.replace(/\.pdf$/i, "").trim() || "Imported CV";
  return `# ${title}\n\nImported from PDF.`;
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

async function parsePdfToMarkdown(args: {
  apiKey: string;
  fileId: string;
}): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You extract CV/resume content from PDFs. Return only plain markdown text. " +
            "Do not return JSON. Do not use code fences. Keep factual content from the document.",
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
                "Read this CV PDF and convert it into a clear markdown CV. " +
                "Use headings, bullet lists and short sections. Output markdown only.",
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

  if (!contentText.trim()) {
    throw new Error("OpenAI chat completion returned empty markdown");
  }

  return contentText;
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

      const parsedMarkdown = await parsePdfToMarkdown({
        apiKey,
        fileId: openAiFileId,
      });

      const cvId: Id<"cvs"> = await ctx.runMutation(internal.cvs.createFromParsed, {
        sourceUploadId: args.uploadId,
        description: normalizeMarkdown(parsedMarkdown, upload.fileName),
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
