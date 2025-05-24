import * as p from "drizzle-orm/sqlite-core";
import { randomUUID } from "crypto";

export const apiKey = p.sqliteTable("api_key", {
    // Primary key with auto-incrementing ID
    uuid: p
        .text("uuid")
        .primaryKey()
        .$defaultFn(() => randomUUID()),
    // API key value - must be unique
    key: p.text("key").notNull().unique(),
    // user uuid
    user: p.text("user"),
    // Display name for the API key
    name: p.text("name").default("default"),
    // Whether the key is currently active
    isActive: p.integer("is_active", { mode: "boolean" }).notNull().default(true),
    // User/system that created this key
    createdBy: p.integer("created_by").default(-1),
    // Available credit balance
    credits: p.integer("credits").notNull().default(0),
    // Timestamp when the key was created
    createdAt: p.integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    // Timestamp of last API key usage
    lastUsedAt: p.integer("last_used_at", { mode: "timestamp" }),
    // Optional expiration timestamp
    expiresAt: p.integer("expires_at", { mode: "timestamp" }),
});

export const requestLog = p.sqliteTable("request_log", {
    // Primary key with auto-incrementing ID
    uuid: p
        .text("uuid")
        .primaryKey()
        .$defaultFn(() => randomUUID()),
    // API key that made the request
    apiKey: p.text("api_key_id").references(() => apiKey.uuid),
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
    requestPayload: p.text("request_payload", { mode: "json" }).$type<string[]>(),
    // Request header
    requestHeader: p.text("request_header", { mode: "json" }).$type<string[]>(),
    // Response body
    responseBody: p.text("response_body", { mode: "json" }).$type<string[]>(),
    // Response header
    responseHeader: p.text("response_header", { mode: "json" }).$type<string[]>(),
    // Success or not
    success: p.integer("success", { mode: "boolean" }).notNull().default(true),
    // create at
    createdAt: p.integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
