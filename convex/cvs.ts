import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const socialValidator = v.optional(
  v.object({
    linkedin: v.optional(v.string()),
    facebook: v.optional(v.string()),
    youtube: v.optional(v.string()),
    github: v.optional(v.string()),
  }),
);

const contactValidator = v.object({
  email: v.string(),
  phone: v.string(),
  address: v.optional(v.string()),
});

const socialPatchValidator = v.optional(
  v.object({
    linkedin: v.optional(v.union(v.string(), v.null())),
    facebook: v.optional(v.union(v.string(), v.null())),
    youtube: v.optional(v.union(v.string(), v.null())),
    github: v.optional(v.union(v.string(), v.null())),
  }),
);

const contactPatchValidator = v.optional(
  v.object({
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.union(v.string(), v.null())),
  }),
);

function normalizeAdditionalInfoText(value?: string): string | undefined {
  if (typeof value !== "string") return undefined;
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return undefined;
  return lines.join("\n");
}

function parseAdditionalInfoLines(value?: string): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export const create = mutation({
  args: {
    userId: v.optional(v.id("users")),
    sourceUploadId: v.optional(v.id("cvUploads")),
    labels: v.array(v.string()),
    experiences: v.array(v.string()),
    skills: v.array(v.string()),
    social: socialValidator,
    contact: contactValidator,
    additionalInfo: v.optional(v.string()),
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
      labels: args.labels,
      experiences: args.experiences,
      skills: args.skills,
      social: args.social,
      contact: args.contact,
      additionalInfo: normalizeAdditionalInfoText(args.additionalInfo),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createFromParsed = internalMutation({
  args: {
    sourceUploadId: v.id("cvUploads"),
    labels: v.array(v.string()),
    experiences: v.array(v.string()),
    skills: v.array(v.string()),
    social: socialValidator,
    contact: contactValidator,
    additionalInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("cvs", {
      sourceUploadId: args.sourceUploadId,
      labels: args.labels,
      experiences: args.experiences,
      skills: args.skills,
      social: args.social,
      contact: args.contact,
      additionalInfo: normalizeAdditionalInfoText(args.additionalInfo),
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
    labelsToAdd: v.optional(v.array(v.string())),
    labelsToRemove: v.optional(v.array(v.string())),
    experiencesToAdd: v.optional(v.array(v.string())),
    experiencesToRemove: v.optional(v.array(v.string())),
    skillsToAdd: v.optional(v.array(v.string())),
    skillsToRemove: v.optional(v.array(v.string())),
    additionalInfoToAdd: v.optional(v.array(v.string())),
    additionalInfoToRemove: v.optional(v.array(v.string())),
    additionalInfo: v.optional(v.string()),
    social: socialPatchValidator,
    contact: contactPatchValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.cvId);
    if (!existing) {
      throw new Error("CV not found");
    }

    const applyListPatch = (
      current: string[],
      add?: string[],
      remove?: string[]
    ): string[] => {
      const withoutRemoved = remove?.length
        ? current.filter((item) => !remove.includes(item))
        : [...current];
      const next = [...withoutRemoved];
      for (const item of add ?? []) {
        if (!next.includes(item)) next.push(item);
      }
      return next;
    };

    const nextSocial = (() => {
      if (!args.social) return existing.social;

      const base = existing.social ?? {};
      const merged = {
        linkedin:
          args.social.linkedin === undefined
            ? base.linkedin
            : args.social.linkedin ?? undefined,
        facebook:
          args.social.facebook === undefined
            ? base.facebook
            : args.social.facebook ?? undefined,
        youtube:
          args.social.youtube === undefined
            ? base.youtube
            : args.social.youtube ?? undefined,
        github:
          args.social.github === undefined
            ? base.github
            : args.social.github ?? undefined,
      };

      if (
        !merged.linkedin &&
        !merged.facebook &&
        !merged.youtube &&
        !merged.github
      ) {
        return undefined;
      }

      return merged;
    })();

    const nextContact = (() => {
      if (!args.contact) return existing.contact;

      return {
        email: args.contact.email ?? existing.contact.email,
        phone: args.contact.phone ?? existing.contact.phone,
        address:
          args.contact.address === undefined
            ? existing.contact.address
            : args.contact.address ?? undefined,
      };
    })();

    const nextAdditionalInfo = (() => {
      const isReplaceRequested = args.additionalInfo !== undefined;
      const hasPatch =
        Boolean(args.additionalInfoToAdd?.length) ||
        Boolean(args.additionalInfoToRemove?.length);
      if (!isReplaceRequested && !hasPatch) {
        return existing.additionalInfo;
      }

      let lines = isReplaceRequested
        ? parseAdditionalInfoLines(args.additionalInfo)
        : parseAdditionalInfoLines(existing.additionalInfo);

      if (args.additionalInfoToRemove?.length) {
        const removeSet = new Set(
          args.additionalInfoToRemove.map((line) => line.trim()).filter(Boolean),
        );
        lines = lines.filter((line) => !removeSet.has(line));
      }

      if (args.additionalInfoToAdd?.length) {
        for (const line of args.additionalInfoToAdd) {
          const normalized = line.trim();
          if (!normalized || lines.includes(normalized)) continue;
          lines.push(normalized);
        }
      }

      return lines.length ? lines.join("\n") : undefined;
    })();

    await ctx.db.patch(args.cvId, {
      labels: applyListPatch(existing.labels, args.labelsToAdd, args.labelsToRemove),
      experiences: applyListPatch(
        existing.experiences,
        args.experiencesToAdd,
        args.experiencesToRemove
      ),
      skills: applyListPatch(existing.skills, args.skillsToAdd, args.skillsToRemove),
      additionalInfo: nextAdditionalInfo,
      social: nextSocial,
      contact: nextContact,
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

    if (locale === "es") {
      return {
        message:
          "Antes de guardar cambios en la CV, confirma detalles y pide contexto adicional para enriquecer la información.",
        sectionHint: section ?? null,
        followUpQuestions: [
          section
            ? `¿Quieres incluir algo más con respecto a ${section}?`
            : "¿Quieres incluir algo más con respecto a esta skill / experiencia?",
          section
            ? `¿Te gustaría subir algún material para más contexto de ${section}?`
            : "¿Te gustaría subir algún material para más contexto de esta skill / experiencia?",
          "¿Hay algún dato que no encaje en el modelo actual? Si sí, lo guardo en additionalInfo en formato clave: valor.",
        ],
        additionalInfoRule:
          "Si el usuario comparte campos fuera del modelo (por ejemplo secondaryEmail), guárdalos en additionalInfo como texto plano, por ejemplo: secondaryEmail: abc@gmail.com",
        cvSummary: {
          labelsCount: cv.labels.length,
          experiencesCount: cv.experiences.length,
          skillsCount: cv.skills.length,
          hasAdditionalInfo: Boolean(cv.additionalInfo),
        },
      };
    }

    return {
      message:
        "Before saving CV updates, confirm details and ask for extra context to enrich the information.",
      sectionHint: section ?? null,
      followUpQuestions: [
        section
          ? `Do you want to include anything else about ${section}?`
          : "Do you want to include anything else about this skill / experience?",
        section
          ? `Would you like to upload any material for more context about ${section}?`
          : "Would you like to upload any material for more context about this skill / experience?",
        "Is there any data that does not fit the current schema? If so, I can store it in additionalInfo using key: value plain text.",
      ],
      additionalInfoRule:
        "If the user shares fields outside the schema (for example secondaryEmail), store them in additionalInfo as plain text, e.g. secondaryEmail: abc@gmail.com",
      cvSummary: {
        labelsCount: cv.labels.length,
        experiencesCount: cv.experiences.length,
        skillsCount: cv.skills.length,
        hasAdditionalInfo: Boolean(cv.additionalInfo),
      },
    };
  },
});
