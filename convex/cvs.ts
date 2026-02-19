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
