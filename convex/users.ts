import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByAuthId = query({
  args: {
    authId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", args.authId))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    authId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", args.authId))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        updatedAt: now,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      authId: args.authId,
      email: args.email,
      createdAt: now,
      updatedAt: now,
    });
  },
});
