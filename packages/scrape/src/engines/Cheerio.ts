import { BaseEngine } from './Base.js';
import { CheerioCrawler, log, LogLevel, RequestQueue, CheerioCrawlingContext, Dictionary, CheerioCrawlerOptions } from 'crawlee';
import { randomUUID } from 'crypto';
import { join } from 'path';

interface CheerioEngineOptions {
    minConcurrency?: number;
    maxConcurrency?: number;
    maxRequestRetries?: number;
    requestHandlerTimeoutSecs?: number;
    requestHandler?: (context: CheerioCrawlingContext<Dictionary>) => Promise<void>;
    failedRequestHandler?: (params: CheerioCrawlingContext<Dictionary>) => void;
    maxRequestsPerCrawl?: number;
    maxRequestTimeout?: number;
    navigationTimeoutSecs?: number;
    requestQueueName?: string;
    requestQueue?: RequestQueue;
    autoscaledPoolOptions?: {
        isFinishedFunction: () => Promise<boolean>;
    };
}

/**
 * CheerioEngine class for web scraping using Cheerio
 * A lightweight implementation for parsing and extracting data from HTML
 */
export class CheerioEngine extends BaseEngine {
    protected options: CheerioEngineOptions = {};
    protected engine: CheerioCrawler | null = null;
    protected queue: RequestQueue | undefined = undefined;
    protected isInitialized: boolean = false;
    protected customRequestHandler?: (context: CheerioCrawlingContext<Dictionary>) => Promise<void>;
    protected customFailedRequestHandler?: (params: CheerioCrawlingContext<Dictionary>) => void;

    /**
     * Constructor for CheerioEngine
     * @param options Optional configuration options for the engine
     */
    constructor(options: CheerioEngineOptions = {}) {
        super();
        this.options = options;
        this.customRequestHandler = options.requestHandler;
        this.customFailedRequestHandler = options.failedRequestHandler;
        this.loadOptions();
    }

    /**
     * Load the options for the engine
     */
    loadOptions(): void {
        this.options = {
            minConcurrency: this.minConcurrency,
            maxConcurrency: this.maxConcurrency,
            maxRequestRetries: this.maxRequestRetries,
            requestHandlerTimeoutSecs: this.requestHandlerTimeoutSecs,
            requestQueue: this.queue,
            ...this.options,
        };
    }

    /**
     * Initialize the crawler engine
     */
    async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        const defaultRequestHandler = async (context: CheerioCrawlingContext<Dictionary>) => {
            const { pushData, request, $ } = context;
            const data = {
                url: request.url,
                title: $('title').text(),
                data: $('body').text(),
                timestamp: new Date().toISOString(),
            };
            log.info(`Pushing data for ${request.url}`);
            await pushData(data);
        };

        const defaultFailedRequestHandler = (context: CheerioCrawlingContext<Dictionary>) => {
            log.error(`Request ${context.request.url} failed`);
        };

        const requestHandler = async (context: CheerioCrawlingContext<Dictionary>) => {
            try {
                if (this.customRequestHandler) {
                    await this.customRequestHandler(context);
                } else {
                    await defaultRequestHandler(context);
                }
            } catch (error) {
                log.error(`Error processing request ${context.request.url}: ${error}`);
                throw error;
            }
        };

        const failedRequestHandler = this.customFailedRequestHandler || defaultFailedRequestHandler;

        const crawlerOptions = {
            ...this.options,
            requestHandler,
            failedRequestHandler,
        };
        crawlerOptions.autoscaledPoolOptions = {
            isFinishedFunction: async () => {
                return false;
            }
        }
        this.engine = new CheerioCrawler(crawlerOptions);
        this.isInitialized = true;
    }

    /**
     * Get the underlying CheerioCrawler instance
     * @returns The CheerioCrawler instance
     */
    getEngine(): CheerioCrawler {
        if (!this.engine) {
            throw new Error('Engine not initialized. Call init() first.');
        }
        return this.engine;
    }

    /**
     * Set a custom request handler
     * @param handler The request handler function
     */
    setRequestHandler(handler: (context: CheerioCrawlingContext<Dictionary>) => Promise<void>): void {
        this.customRequestHandler = handler;
        if (this.isInitialized) {
            this.init();
        }
    }

    /**
     * Set a custom failed request handler
     * @param handler The failed request handler function
     */
    setFailedRequestHandler(handler: (params: CheerioCrawlingContext<Dictionary>) => void): void {
        this.customFailedRequestHandler = handler;
        if (this.isInitialized) {
            this.init();
        }
    }

    /**
     * Run the crawler with the given URLs
     * @param urls Array of URLs to crawl
     */
    async run(): Promise<void> {
        if (!this.isInitialized) {
            await this.init();
        }

        if (!this.engine) {
            throw new Error('Engine not initialized');
        }

        try {
            // Set up autoscaled pool options to keep running
            this.options.autoscaledPoolOptions = {
                isFinishedFunction: async () => {
                    // Keep running until explicitly stopped
                    return false;
                }
            };

            log.info('Starting crawler engine...');
            await this.engine.run();
            log.info('Crawler engine started successfully');
        } catch (error) {
            log.error(`Error running crawler: ${error}`);
            throw error;
        }
    }

    /**
     * Stop the crawler
     */
    async stop(): Promise<void> {
        if (this.engine) {
            await this.engine.stop();
        }
    }

    /**
     * Check if the engine is initialized
     * @returns boolean indicating if the engine is initialized
     */
    isEngineInitialized(): boolean {
        return this.isInitialized;
    }
}

