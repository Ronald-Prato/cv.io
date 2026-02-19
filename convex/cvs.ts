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

export const create = mutation({
  args: {
    userId: v.optional(v.id("users")),
    sourceUploadId: v.optional(v.id("cvUploads")),
    labels: v.array(v.string()),
    experiences: v.array(v.string()),
    skills: v.array(v.string()),
    social: socialValidator,
    contact: contactValidator,
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

    await ctx.db.patch(args.cvId, {
      labels: applyListPatch(existing.labels, args.labelsToAdd, args.labelsToRemove),
      experiences: applyListPatch(
        existing.experiences,
        args.experiencesToAdd,
        args.experiencesToRemove
      ),
      skills: applyListPatch(existing.skills, args.skillsToAdd, args.skillsToRemove),
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
