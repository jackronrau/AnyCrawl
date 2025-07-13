import { z } from "zod";
import { baseSchema } from "./BaseSchema.js";
import { scrapeSchema } from "./ScrapeSchema.js";

// Crawl specific options
const crawlOptionsSchema = z.object({
    /**
     * Paths to exclude from crawling (supports wildcards)
     */
    exclude_paths: z.array(z.string()).optional(),

    /**
     * Paths to include in crawling (supports wildcards)
     */
    include_paths: z.array(z.string()).optional(),

    /**
     * Maximum depth to crawl from the starting URL
     */
    max_depth: z.number().min(1).max(50).default(10),

    /**
     * Maximum depth for URL discovery (can be larger than maxDepth)
     */
    max_discovery_depth: z.number().min(1).max(100).default(10),

    /**
     * Whether to ignore sitemap.xml for crawling
     */
    ignore_sitemap: z.boolean().default(false),

    /**
     * Whether to ignore query parameters in URLs
     */
    ignore_query_parameters: z.boolean().default(false),

    /**
     * Maximum number of pages to crawl
     */
    limit: z.number().min(1).max(50000).default(10000),

    /**
     * Whether to crawl the entire domain
     */
    crawl_entire_domain: z.boolean().default(false),

    /**
     * Whether to allow external links
     */
    allow_external_links: z.boolean().default(false),

    /**
     * Whether to allow subdomains
     */
    allow_subdomains: z.boolean().default(false),

    /**
     * Delay between requests in milliseconds
     */
    delay: z.number().min(0).max(60000).default(0),

});

// Extract scrape option fields from baseSchema for reuse (same as ScrapeSchema)
const scrapeOptionsInputSchema = baseSchema.pick({
    formats: true,
    timeout: true,
    retry: true,
    wait_for: true,
    include_tags: true,
    exclude_tags: true,
    json_options: true,
}).strict();

// Shared function to convert scrape options to expected format
const convertScrapeOptions = (data: any) => ({
    formats: data.formats,
    timeout: data.timeout,
    retry: data.retry,
    waitFor: data.wait_for,
    includeTags: data.include_tags,
    excludeTags: data.exclude_tags,
    json_options: data.json_options,
});

// Use the full base schema to inherit all scrape parameters
export const crawlSchema: z.ZodSchema<any> = baseSchema
    .extend({
        // Reuse the strict scrape options input schema for validation
        scrape_options: scrapeOptionsInputSchema.partial().optional(),
    })
    .merge(crawlOptionsSchema)
    .strict() // Make the entire schema strict to catch unknown fields
    .transform((data) => {
        // Use shared conversion function for scrape_options
        const scrapeOptions = data.scrape_options
            ? convertScrapeOptions(data.scrape_options)
            : scrapeSchema.parse(data).options;

        return {
            url: data.url,
            engine: data.engine,
            exclude_paths: data.exclude_paths,
            include_paths: data.include_paths,
            max_depth: data.max_depth,
            max_discovery_depth: data.max_discovery_depth,
            ignore_sitemap: data.ignore_sitemap,
            ignore_query_parameters: data.ignore_query_parameters,
            limit: data.limit,
            crawl_entire_domain: data.crawl_entire_domain,
            allow_external_links: data.allow_external_links,
            allow_subdomains: data.allow_subdomains,
            delay: data.delay,
            scrape_options: scrapeOptions,
        };
    });

export type CrawlSchema = z.infer<typeof crawlSchema>;

export const CrawlSchemaInput = z.object({
    uuid: z.string().uuid(),
});
export type CrawlSchemaInput = z.input<typeof CrawlSchemaInput>;