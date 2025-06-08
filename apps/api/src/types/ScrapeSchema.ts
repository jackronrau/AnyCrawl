import { z } from "zod";
import { baseSchema } from "./BaseSchema.js";

export const scrapeSchema = baseSchema.pick({
    url: true,
    engine: true,
    proxy: true,
    formats: true,
    timeout: true,
    retry: true,
    wait_for: true,
    include_tags: true,
    exclude_tags: true,
});

export type ScrapeSchema = z.infer<typeof scrapeSchema>;
