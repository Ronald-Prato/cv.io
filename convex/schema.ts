import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    authId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_id", ["authId"])
    .index("by_email", ["email"]),

  cvs: defineTable({
    userId: v.optional(v.id("users")),
    sourceUploadId: v.optional(v.id("cvUploads")),
    labels: v.array(v.string()),
    experiences: v.array(v.string()),
    skills: v.array(v.string()),
    social: v.optional(
      v.object({
        linkedin: v.optional(v.string()),
        facebook: v.optional(v.string()),
        youtube: v.optional(v.string()),
        github: v.optional(v.string()),
      }),
    ),
    contact: v.object({
      email: v.string(),
      phone: v.string(),
      address: v.optional(v.string()),
    }),
    additionalInfo: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_source_upload_id", ["sourceUploadId"])
    .index("by_user_id", ["userId"])
    .index("by_user_id_updated_at", ["userId", "updatedAt"]),

  cvUploads: defineTable({
    userId: v.optional(v.id("users")),
    cvId: v.optional(v.id("cvs")),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id_created_at", ["userId", "createdAt"])
    .index("by_cv_id_created_at", ["cvId", "createdAt"])
    .index("by_storage_id", ["storageId"])
    .index("by_created_at", ["createdAt"]),
});
