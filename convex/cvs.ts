import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

function normalizeDescription(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    throw new Error("CV description cannot be empty");
  }
  return normalized;
}

export const create = mutation({
  args: {
    userId: v.optional(v.id("users")),
    sourceUploadId: v.optional(v.id("cvUploads")),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        throw new Error("User not found");
      }
    }

    return await ctx.db.insert("cvs", {
      userId: args.userId,
      sourceUploadId: args.sourceUploadId,
      description: normalizeDescription(args.description),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createFromParsed = internalMutation({
  args: {
    sourceUploadId: v.id("cvUploads"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("cvs", {
      sourceUploadId: args.sourceUploadId,
      description: normalizeDescription(args.description),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cvs")
      .withIndex("by_user_id_updated_at", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("cvs")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: {
    cvId: v.id("cvs"),
  },
  handler: async (ctx, args) => {
    const cv = await ctx.db.get(args.cvId);
    if (!cv) {
      throw new Error("CV not found");
    }
    return cv;
  },
});

export const updateById = mutation({
  args: {
    cvId: v.id("cvs"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.cvId);
    if (!existing) {
      throw new Error("CV not found");
    }

    await ctx.db.patch(args.cvId, {
      description: normalizeDescription(args.description),
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(args.cvId);
    if (!updated) {
      throw new Error("CV not found after update");
    }

    return updated;
  },
});

export const getUpdatePrompt = query({
  args: {
    cvId: v.id("cvs"),
    locale: v.optional(v.union(v.literal("es"), v.literal("en"))),
    sectionHint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cv = await ctx.db.get(args.cvId);
    if (!cv) {
      throw new Error("CV not found");
    }

    const locale = args.locale === "es" ? "es" : "en";
    const section = args.sectionHint?.trim();
    const descriptionLength = cv.description.trim().length;

    if (locale === "es") {
      return {
        message:
          "Antes de guardar cambios, confirma detalles y mejora el markdown del CV en el campo description.",
        sectionHint: section ?? null,
        followUpQuestions: [
          section
            ? `¿Qué quieres ajustar exactamente en la sección ${section}?`
            : "¿Qué parte del CV quieres ajustar exactamente?",
          "¿Debo preservar el tono y estructura actuales del markdown?",
          "¿Quieres que resuma o expanda partes específicas?",
        ],
        updateRule:
          "Siempre devuelve un markdown completo y coherente para reemplazar description.",
        cvSummary: {
          descriptionLength,
          hasContent: descriptionLength > 0,
        },
      };
    }

    return {
      message:
        "Before saving changes, confirm details and improve the CV markdown stored in description.",
      sectionHint: section ?? null,
      followUpQuestions: [
        section
          ? `What exactly should change in the ${section} section?`
          : "Which part of the CV should change exactly?",
        "Should I preserve the current markdown tone and structure?",
        "Do you want me to summarize or expand specific parts?",
      ],
      updateRule:
        "Always return a complete, coherent markdown text to replace description.",
      cvSummary: {
        descriptionLength,
        hasContent: descriptionLength > 0,
      },
    };
  },
});
