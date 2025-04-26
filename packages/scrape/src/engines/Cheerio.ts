import { Utils } from '../Utils.js';
import { BaseEngine, EngineOptions } from './Base.js';
import { CheerioCrawler, log, CheerioCrawlingContext, Dictionary, Dataset } from 'crawlee';

/**
 * CheerioEngine class for web scraping using Cheerio
 * A lightweight implementation for parsing and extracting data from HTML
 */
export class CheerioEngine extends BaseEngine {
    protected engine: CheerioCrawler | null = null;
    protected isInitialized: boolean = false;
    protected customRequestHandler?: (context: CheerioCrawlingContext<Dictionary>) => Promise<void>;
    protected customFailedRequestHandler?: (params: CheerioCrawlingContext<Dictionary>) => void;

    /**
     * Constructor for CheerioEngine
     * @param options Optional configuration options for the engine
     */
    constructor(options: EngineOptions = {}) {
        super(options);
        this.customRequestHandler = options.requestHandler;
        this.customFailedRequestHandler = options.failedRequestHandler;
    }

    /**
     * Initialize the crawler engine
     */
    async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        const defaultRequestHandler = async (context: CheerioCrawlingContext<Dictionary>) => {
            const { request, $ } = context;
            const jobId = request.userData['jobId'];
            const data = {
                url: request.url,
                title: $('title').text(),
                data: $('body').text(),
                timestamp: new Date().toISOString(),
            };
            await (await Utils.getInstance().getKeyValueStore()).setValue(jobId, data);
            log.info(`Pushing data for ${request.url}, jobId: ${jobId}`);
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

