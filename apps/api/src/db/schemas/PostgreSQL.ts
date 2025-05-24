import * as p from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";

export const apiKey = p.pgTable("api_key", {
    // Primary key with auto-incrementing ID
    uuid: p
        .uuid()
        .primaryKey()
        .$defaultFn(() => randomUUID()),
    // user uuid
    user: p.uuid("user"),
    // API key value - must be unique
    key: p.text("key").notNull().unique(),
    // Display name for the API key
    name: p.text("name").default("default"),
    // Whether the key is currently active
    isActive: p.boolean("is_active").notNull().default(true),
    // User/system that created this key
    createdBy: p.integer("created_by").default(-1),
    // Available credit balance
    credits: p.integer("credits").notNull().default(0),
    // Timestamp when the key was created
    createdAt: p.timestamp("created_at").notNull(),
    // Timestamp of last API key usage
    lastUsedAt: p.timestamp("last_used_at"),
    // Optional expiration timestamp
    expiresAt: p.timestamp("expires_at"),
});

export const requestLog = p.pgTable("request_log", {
    // Primary key with auto-incrementing ID
    uuid: p
        .uuid()
        .primaryKey()
        .$defaultFn(() => randomUUID()),
    // API key that made the request
    apiKey: p.uuid("api_key_id").references(() => apiKey.uuid),
    // path that was called
    path: p.text("path").notNull(),
    // HTTP method used
    method: p.text("method").notNull(),
    // Response status code
    statusCode: p.integer("status_code").notNull(),
    // Request processing time in milliseconds
    processingTimeMs: p.real("processing_time_ms").notNull(),
    // Number of credits consumed
    creditsUsed: p.integer("credits_used").notNull().default(0),
    // Request IP address
    ipAddress: p.text("ip_address"),
    // User agent string
    userAgent: p.text("user_agent"),
    // Request body
    requestPayload: p.jsonb("request_payload"),
    // Request header
    requestHeader: p.jsonb("request_header"),
    // Response body
    responseBody: p.jsonb("response_body"),
    // Response header
    responseHeader: p.jsonb("response_header"),
    // Success or not
    success: p.boolean("success").notNull().default(true),
    // create at
    createdAt: p.timestamp("created_at").notNull(),
});
