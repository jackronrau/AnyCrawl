import { log } from "@anycrawl/libs"
import { htmlToMarkdown } from "@anycrawl/libs/html-to-markdown";
import { HTMLTransformer, ExtractionOptions } from "./transformers/HTMLTransformer.js";
import { CrawlingContext } from "../engines/Base.js";
import { Utils } from "../Utils.js";
import { ScreenshotTransformer } from "./transformers/ScreenshotTransformer.js";

export interface MetadataEntry {
    name: string;
    content: string;
    property?: string;
}

export interface BaseContent {
    url: string;
    title: string;
    rawHtml: string;
    [key: string]: any;
}

export interface AdditionalFields {
    html?: string;
    markdown?: string;
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
    private htmlTransformer: HTMLTransformer;
    private screenshotTransformer: ScreenshotTransformer;

    constructor() {
        this.htmlTransformer = new HTMLTransformer();
        this.screenshotTransformer = new ScreenshotTransformer();
    }

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
        let rawHtml = "";
        if (context.body) {
            // body (Cheerio engine) is available
            rawHtml = context.body.toString("utf-8");
        } else if (context.page.content) {
            // page.content (browser engines) is available
            rawHtml = await context.page.content();
        } else {
            // Fallback: try to get HTML from cheerio if available (Cheerio engine)
            rawHtml = $('html').length > 0 ? $('html').parent().html() || $.html() : '';
        }
        const title = $('title').text().trim();

        return {
            url: context.request.url,
            title,
            rawHtml,
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
    assembleData(context: any, baseContent: BaseContent, metadata: MetadataEntry[], additionalFields: AdditionalFields): any {
        const jobId = context.request.userData["jobId"];
        const { url, title, rawHtml, ...baseAdditionalFields } = baseContent;
        const formats = context.request.userData?.options?.formats;

        return {
            jobId: jobId,
            url,
            title,
            ...(Array.isArray(formats) && formats.includes("rawHtml") ? { rawHtml } : {}),
            metadata,
            ...baseAdditionalFields,
            ...additionalFields,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Extract all data from context
     */
    async extractData(context: CrawlingContext): Promise<any> {
        const $ = await this.getCheerioInstance(context);
        const baseContent = await this.extractBaseContent(context, $);
        const metadata = this.extractMetadata($);
        const formats = context.request.userData["options"]["formats"];
        const options = context.request.userData["options"];
        const additionalFields: AdditionalFields = {};

        if (formats.includes("html") || formats.includes("markdown")) {
            // Extract clean HTML content with optional include/exclude tags
            const extractionOptions: ExtractionOptions = {
                includeTags: options.includeTags,
                excludeTags: options.excludeTags
            };

            const cleanHtml = this.htmlTransformer.extractCleanHtml($, extractionOptions);

            if (formats.includes("html")) {
                additionalFields.html = cleanHtml;
            }

            if (formats.includes("markdown")) {
                // Use clean HTML for markdown conversion
                additionalFields.markdown = this.processMarkdown(cleanHtml);
            }
        }
        if (formats.includes("rawHtml")) {
            additionalFields.rawHtml = baseContent.rawHtml;
        }
        // Handle screenshot capture for browser engines
        const page = (context as any).page;
        if (page && typeof context.saveSnapshot === 'function' && (formats.includes("screenshot") || formats.includes("screenshot@fullPage"))) {
            additionalFields.screenshot = await this.screenshotTransformer.captureAndStoreScreenshot(context, page, formats);
        }
        return this.assembleData(context, baseContent, metadata, additionalFields);
    }

    /**
     * Handle extraction errors
     */
    handleExtractionError(context: CrawlingContext, error: Error): never {
        const jobId = context.request.userData["jobId"];
        const queueName = context.request.userData["queueName"];

        log.error(
            `[${queueName}] [${jobId}] Extraction failed: ${error.message}`
        );

        throw new Error(`Data extraction failed: ${error.message}. Stack: ${error.stack}`);
    }
} 