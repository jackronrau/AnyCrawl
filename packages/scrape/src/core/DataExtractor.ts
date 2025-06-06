import { log } from "@anycrawl/libs"
import { htmlToMarkdown } from "@anycrawl/libs/html-to-markdown";
import { HTMLTransformer, ExtractionOptions } from "./HTMLTransformer.js";
import { CrawlingContext } from "../engines/Base.js";
import { Utils } from "../Utils.js";

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

    constructor() {
        this.htmlTransformer = new HTMLTransformer();
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
        const title = $('title').text().trim();

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

        return {
            job_id: jobId,
            url,
            title,
            ...(context.request.userData["options"]["formats"].includes("rawHtml") ? { rawHtml } : {}),
            metadata,
            ...baseAdditionalFields,
            ...additionalFields,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Capture screenshot using CDP
     * Tips: it need more time, and we need to test it more. It will maybe released in the future.
     * @param context - Crawling context
     * @param fullPage - Whether to capture the full page
     * @returns Buffer of the screenshot
     */
    async CDPCaptureScreenshot(context: CrawlingContext, fullPage: boolean): Promise<any> {
        const screenshotOptions = fullPage ? { fullPage: true, quality: 100, type: 'jpeg' } : { quality: 100, type: 'jpeg' };
        const cdpOptions: {
            format: 'jpeg' | 'png' | 'webp';
            quality?: number;
            captureBeyondViewport?: boolean;
        } = {
            format: screenshotOptions.type as 'jpeg' | 'png' | 'webp' || 'jpeg',
        };
        if (screenshotOptions.quality) {
            cdpOptions.quality = screenshotOptions.quality;
        }
        if (screenshotOptions.fullPage) {
            cdpOptions.captureBeyondViewport = true;
        }

        let screenshot: Buffer;
        const page = (context as any).page;
        try {
            let session;
            // page.context() exists on Playwright's Page, but not Puppeteer's
            if (page.context && typeof page.context === 'function') {
                // Playwright
                session = await page.context().newCDPSession(page);
            } else if (page.target && typeof page.target === 'function') {
                // Puppeteer
                session = await page.target().createCDPSession();
            }

            if (session) {
                try {
                    if (cdpOptions.captureBeyondViewport) {
                        const { contentSize } = await session.send('Page.getLayoutMetrics');
                        const pageSize = await page.evaluate(() => ({
                            height: Math.max(
                                document.body.scrollHeight,
                                document.documentElement.scrollHeight,
                                document.body.offsetHeight,
                                document.documentElement.offsetHeight,
                                document.body.clientHeight,
                                document.documentElement.clientHeight,
                            ),
                        }));

                        await session.send('Emulation.setDeviceMetricsOverride', {
                            width: pageSize.width,
                            height: Math.max(contentSize.height, pageSize.height),
                            deviceScaleFactor: 1,
                            mobile: false,
                        });
                    }

                    const { data } = await session.send('Page.captureScreenshot', cdpOptions);
                    screenshot = Buffer.from(data, 'base64');

                    if (cdpOptions.captureBeyondViewport) {
                        await session.send('Emulation.clearDeviceMetricsOverride');
                    }
                } finally {
                    await session.detach();
                }
            } else {
                log.warning(`Could not determine browser engine for CDP. Falling back to default screenshot method.`);
                screenshot = await page.screenshot(screenshotOptions);
            }
        } catch (e) {
            log.warning(`CDP screenshot capture failed: ${e instanceof Error ? e.message : String(e)}. Falling back to default screenshot method.`);
            screenshot = await page.screenshot(screenshotOptions);
        }
        return screenshot;
    }

    private async _captureAndStoreScreenshot(context: CrawlingContext, page: any, formats: string[]): Promise<string | void> {
        try {
            const jobId = context.request.userData["jobId"];
            let fileName: string | undefined;
            let screenshotOptions: any;

            if (formats.includes("screenshot@fullPage")) {
                fileName = `screenshot-fullPage-${jobId}`;
                screenshotOptions = { fullPage: true, quality: 100, type: 'jpeg' };
            } else if (formats.includes("screenshot")) {
                fileName = `screenshot-${jobId}`;
                screenshotOptions = { quality: 100, type: 'jpeg' };
            }

            if (fileName && screenshotOptions) {
                const keyValueStore = await Utils.getInstance().getKeyValueStore();
                const screenshot = await page.screenshot(screenshotOptions);
                await keyValueStore.setValue(fileName, screenshot, { contentType: `image/${screenshotOptions.type}` });
            }
            return fileName;
        } catch (error) {
            log.warning(`Screenshot capture failed: ${error instanceof Error ? error.message : String(error)}`);
            return;
        }
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
            additionalFields.screenshot = await this._captureAndStoreScreenshot(context, page, formats);
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