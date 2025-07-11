import { z } from "zod";
import { baseSchema } from "./BaseSchema.js";

const pickedSchema = baseSchema.pick({
    url: true,
    engine: true,
    proxy: true,
    formats: true,
    timeout: true,
    retry: true,
    wait_for: true,
    include_tags: true,
    exclude_tags: true,
    json_options: true,
});

export const scrapeSchema = pickedSchema.transform((data) => ({
    url: data.url,
    engine: data.engine,
    options: {
        proxy: data.proxy,
        formats: data.formats,
        timeout: data.timeout,
        retry: data.retry,
        waitFor: data.wait_for,
        includeTags: data.include_tags,
        excludeTags: data.exclude_tags,
        json_options: data.json_options,
    }
}));

export type ScrapeSchema = z.infer<typeof scrapeSchema>;
