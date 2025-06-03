import { log } from "crawlee";
import { htmlToMarkdown } from "@anycrawl/libs/html-to-markdown";

export interface MetadataEntry {
    name: string;
    content: string;
    property?: string;
}

export interface BaseContent {
    url: string;
    title: string;
    html: string;
    [key: string]: any;
}

export interface ExtractionError {
    step: string;
    message: string;
    originalError?: Error;
}

/**
 * Data extractor for crawling operations
 * Handles all data extraction and transformation logic
 */
export class DataExtractor {
    /**
     * Get cheerio instance using unified approach
     */
    async getCheerioInstance(context: any): Promise<any> {
        if (context.parseWithCheerio) {
            // Playwright and Puppeteer have parseWithCheerio method
            return await context.parseWithCheerio();
        } else if (context.$) {
            // CheerioEngine uses existing $ object
            return context.$;
        } else {
            throw new Error("No cheerio instance available in context");
        }
    }

    /**
     * Extract base content (url, title, html) in a unified way
     */
    async extractBaseContent(context: any, $: any): Promise<BaseContent> {
        const title = $('title').text().trim();

        let html = "";
        if (context.parseWithCheerio || context.body) {
            // parseWithCheerio or body (Cheerio engine) is available
            html = context.body.toString("utf-8");
        } else if (context.page?.content) {
            // page.content (browser engines) is available
            html = await context.page.content();
        } else {
            // Fallback: try to get HTML from cheerio if available (Cheerio engine)
            html = $('html').length > 0 ? $('html').parent().html() || $.html() : '';
        }

        return {
            url: context.request.url,
            title,
            html,
        };
    }

    /**
     * Extract metadata from cheerio instance
     */
    extractMetadata($: any): MetadataEntry[] {
        const metadata: MetadataEntry[] = [];

        $("meta").each((_: number, element: any) => {
            const $el = $(element);
            const name = $el.attr("name");
            const property = $el.attr("property");
            const content = $el.attr("content");

            if ((name || property) && content) {
                metadata.push({
                    name: name || property,
                    content: content.trim(),
                    property: property || undefined,
                });
            }
        });

        return metadata;
    }

    /**
     * Process HTML content to markdown
     */
    processMarkdown(html: string): string {
        return htmlToMarkdown(html);
    }

    /**
     * Assemble final data object
     */
    assembleData(context: any, baseContent: BaseContent, metadata: MetadataEntry[], markdown: string): any {
        const jobId = context.request.userData["jobId"];
        const { url, title, html, ...additionalFields } = baseContent;

        return {
            job_id: jobId,
            url,
            title,
            html,
            metadata,
            markdown,
            ...additionalFields,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Extract all data from context
     */
    async extractData(context: any): Promise<any> {
        const $ = await this.getCheerioInstance(context);
        const baseContent = await this.extractBaseContent(context, $);
        const metadata = this.extractMetadata($);
        const markdown = this.processMarkdown(baseContent.html);

        return this.assembleData(context, baseContent, metadata, markdown);
    }

    /**
     * Handle extraction errors
     */
    handleExtractionError(context: any, error: Error): never {
        const jobId = context.request.userData["jobId"];
        const queueName = context.request.userData["queueName"];

        log.error(
            `[${queueName}] [${jobId}] Extraction failed: ${error.message}`
        );

        throw new Error(`Data extraction failed: ${error.message}. Stack: ${error.stack}`);
    }
} 