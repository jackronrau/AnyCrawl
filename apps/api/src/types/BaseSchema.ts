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
});

export type BaseSchema = z.infer<typeof baseSchema>;
