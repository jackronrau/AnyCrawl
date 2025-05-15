import { z } from "zod";
import { baseSchema } from "./BaseSchema.js";

export const scrapeSchema = baseSchema.pick({
    url: true,
    engine: true,
    proxy: true,
});

export type ScrapeSchema = z.infer<typeof scrapeSchema>;
