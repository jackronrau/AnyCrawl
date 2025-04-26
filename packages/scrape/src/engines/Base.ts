import { Configuration, KeyValueStore } from "crawlee";
import { join } from "path";
import { RequestQueue, BrowserCrawlingContext, CheerioCrawlingContext, PlaywrightCrawlingContext, PuppeteerCrawlingContext, Dictionary } from "crawlee";
import { Utils } from "../Utils.js";

export type CrawlingContext = BrowserCrawlingContext<Dictionary> | CheerioCrawlingContext<Dictionary> | PlaywrightCrawlingContext<Dictionary> | PuppeteerCrawlingContext<Dictionary>;

export interface EngineOptions {
    minConcurrency?: number;
    maxConcurrency?: number;
    maxRequestRetries?: number;
    requestHandlerTimeoutSecs?: number;
    requestHandler?: (context: CrawlingContext) => Promise<void>;
    failedRequestHandler?: (context: CrawlingContext) => void;
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
 * BaseEngine abstract class
 * Defines the interface for all scraping engines
 */
export abstract class BaseEngine {
    /**
     * The options for the engine
     */
    protected options: EngineOptions = {};

    /**
     * The request queue for the engine 
     */
    protected queue: RequestQueue | undefined = undefined;

    /**
     * The key-value store for the engine
     */
    protected keyValueStore: KeyValueStore | undefined = undefined;

    /**
     * The engine instance used for scraping
     */
    protected abstract engine: any;

    /**
     * Constructor for BaseEngine
     * Initializes the base engine properties
     */
    constructor(options: EngineOptions = {}) {
        // Base initialization logic
        Utils.getInstance().setStorageDirectory();

        this.options = {
            minConcurrency: 10,
            maxConcurrency: 50,
            maxRequestRetries: 2,
            requestHandlerTimeoutSecs: 60,
            ...options,
        };
    }
}
