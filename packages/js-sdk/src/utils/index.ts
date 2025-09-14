import type { CrawlRequest, SearchRequest, ScrapeOptionsInput, Engine } from '../types.js';

export function omitUndefined<T extends Record<string, any>>(obj: T | undefined): Partial<T> {
    if (!obj || typeof obj !== 'object') return {} as Partial<T>;
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) cleaned[key] = value;
    }
    return cleaned;
}

export async function sleep(seconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, seconds) * 1000));
}

/**
 * Merge crawl top-level scrape fields with nested scrape_options, nested wins.
 * Strips disallowed keys for nested options (retry, extract_source) and undefineds.
 */
export function buildCrawlScrapeOptions(
    input: CrawlRequest
): Partial<Omit<ScrapeOptionsInput, 'retry' | 'extract_source'>> {
    const merged: Partial<Omit<ScrapeOptionsInput, 'retry' | 'extract_source'>> = {};
    // Top-level
    if (input.proxy != null) merged.proxy = input.proxy;
    if (input.formats != null) merged.formats = input.formats;
    if (input.timeout != null) merged.timeout = input.timeout;
    if (input.wait_for != null) merged.wait_for = input.wait_for;
    if (input.include_tags != null) merged.include_tags = input.include_tags;
    if (input.exclude_tags != null) merged.exclude_tags = input.exclude_tags;
    if (input.json_options != null) merged.json_options = input.json_options;
    // Nested overrides
    if (input.scrape_options) {
        const nested = input.scrape_options;
        if (nested.proxy != null) merged.proxy = nested.proxy;
        if (nested.formats != null) merged.formats = nested.formats;
        if (nested.timeout != null) merged.timeout = nested.timeout;
        if (nested.wait_for != null) merged.wait_for = nested.wait_for;
        if (nested.include_tags != null) merged.include_tags = nested.include_tags;
        if (nested.exclude_tags != null) merged.exclude_tags = nested.exclude_tags;
        if (nested.json_options != null) merged.json_options = nested.json_options;
    }
    return merged;
}

/**
 * Clean search scrape_options by removing undefined and disallowed keys.
 */
export function buildSearchScrapeOptions(
    options: SearchRequest['scrape_options']
): SearchRequest['scrape_options'] {
    const out: SearchRequest['scrape_options'] = { engine: options.engine as Engine };
    if (options.proxy != null) out.proxy = options.proxy;
    if (options.formats != null) out.formats = options.formats;
    if (options.timeout != null) out.timeout = options.timeout;
    if (options.wait_for != null) out.wait_for = options.wait_for;
    if (options.include_tags != null) out.include_tags = options.include_tags;
    if (options.exclude_tags != null) out.exclude_tags = options.exclude_tags;
    if (options.json_options != null) out.json_options = options.json_options;
    return out;
}


