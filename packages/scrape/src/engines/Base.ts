import { Configuration } from "crawlee";
import { join } from "path";

/**
 * BaseEngine abstract class
 * Defines the interface for all scraping engines
 */
export abstract class BaseEngine {
    /**
     * The engine instance used for scraping
     */
    protected abstract engine: any;

    /**
     * Default concurrency settings for crawlers
     */
    protected minConcurrency: number = 10;
    protected maxConcurrency: number = 50;
    /**
     * Default retry settings for crawlers
     */
    protected maxRequestRetries: number = 2;

    protected requestHandlerTimeoutSecs: number = 60;

    /**
     * Get the maximum request retries setting
     * @returns The maximum request retries value
     */
    getMaxRequestRetries(): number {
        return this.maxRequestRetries;
    }

    /**
     * Set the maximum request retries setting
     * @param value The maximum request retries value to set
     */
    setMaxRequestRetries(value: number): void {
        this.maxRequestRetries = value;
    }

    /**
     * Get the request handler timeout in seconds
     * @returns The request handler timeout value in seconds
     */
    getRequestHandlerTimeout(): number {
        return this.requestHandlerTimeoutSecs;
    }

    /**
     * Set the request handler timeout in seconds
     * @param value The request handler timeout value in seconds to set
     */
    setRequestHandlerTimeout(value: number): void {
        this.requestHandlerTimeoutSecs = value;
    }

    /**
     * Get the minimum concurrency setting
     * @returns The minimum concurrency value
     */
    getMinConcurrency(): number {
        return this.minConcurrency;
    }

    /**
     * Set the minimum concurrency setting
     * @param value The minimum concurrency value to set
     */
    setMinConcurrency(value: number): void {
        this.minConcurrency = value;
    }

    /**
     * Get the maximum concurrency setting
     * @returns The maximum concurrency value
     */
    getMaxConcurrency(): number {
        return this.maxConcurrency;
    }

    /**
     * Set the maximum concurrency setting
     * @param value The maximum concurrency value to set
     */
    setMaxConcurrency(value: number): void {
        this.maxConcurrency = value;
    }

    /**
     * Constructor for BaseEngine
     * Initializes the base engine properties
     */
    constructor() {
        // Base initialization logic
        const config = Configuration.getGlobalConfig();
        config.set("storageClientOptions", {
            localDataDirectory: join(process.cwd(), '../../storage'),
        });
    }

}
