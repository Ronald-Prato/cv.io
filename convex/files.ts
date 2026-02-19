import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveUploadedCv = mutation({
  args: {
    userId: v.optional(v.id("users")),
    cvId: v.optional(v.id("cvs")),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        throw new Error("User not found");
      }
    }

    if (args.cvId) {
      const cv = await ctx.db.get(args.cvId);

      if (!cv) {
        throw new Error("CV not found");
      }

      if (args.userId && cv.userId !== args.userId) {
        throw new Error("CV does not belong to the user");
      }
    }

    return await ctx.db.insert("cvUploads", {
      userId: args.userId,
      cvId: args.cvId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getById = internalQuery({
  args: {
    uploadId: v.id("cvUploads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.uploadId);
  },
});

export const attachCv = internalMutation({
  args: {
    uploadId: v.id("cvUploads"),
    cvId: v.id("cvs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.uploadId, {
      cvId: args.cvId,
      updatedAt: Date.now(),
    });
  },
});

export const listByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cvUploads")
      .withIndex("by_user_id_created_at", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const listByCv = query({
  args: {
    cvId: v.id("cvs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cvUploads")
      .withIndex("by_cv_id_created_at", (q) => q.eq("cvId", args.cvId))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("cvUploads")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
  },
});
