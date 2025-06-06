import { z } from "zod";
import { AVAILABLE_ENGINES } from "@anycrawl/scrape/managers/EngineQueue";

export const baseSchema = z.object({
    /**
     * The URL to be processed
     */
    url: z.string().url(),

    /**
     * The engine to be used
     */
    engine: z.enum(AVAILABLE_ENGINES).default("cheerio"),

    /**
     * The proxy to be used
     */
    proxy: z.string().url().optional(),

    /**
     * The formats to be used
     */
    formats: z.array(z.enum(["markdown", "html", "text", "screenshot", "screenshot@fullPage", "rawHtml"])).default(["markdown"]),

    /**
     * The timeout to be used
     */
    timeout: z.number().min(1000).max(60_000).default(30_000),

    /**
     * The wait for to be used
     */
    wait_for: z.number().min(1).max(60_000).optional(),

    /**
     * The retry to be used
     */
    retry: z.boolean().default(false),

    /**
     * The include tags to be used
     */
    include_tags: z.array(z.string()).optional(),

    /**
     * The exclude tags to be used
     */
    exclude_tags: z.array(z.string()).optional(),
});

export type BaseSchema = z.infer<typeof baseSchema>;
