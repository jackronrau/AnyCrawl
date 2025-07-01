import { BrowserCrawlingContext, CheerioCrawlingContext, Configuration, log, PlaywrightCrawlingContext, ProxyConfiguration, PuppeteerCrawlingContext, RequestQueue, sleep } from "crawlee";
import { Dictionary } from "crawlee";
import { Utils } from "../Utils.js";
import { ConfigValidator } from "../core/ConfigValidator.js";
import { DataExtractor } from "../core/DataExtractor.js";
import { JobManager } from "../core/JobManager.js";
import { EngineConfigurator, ConfigurableEngineType } from "../core/EngineConfigurator.js";
import {
    HttpStatusCategory,
    CrawlerErrorType,
    CrawlerError,
    ResponseStatus,
    CrawlerResponse
} from "../types/crawler.js";

// Re-export core types for backward compatibility
export type { MetadataEntry, BaseContent, ExtractionError } from "../core/DataExtractor.js";
export { ConfigurableEngineType as BaseEngineType } from "../core/EngineConfigurator.js";

// Type definitions
export type CrawlingContext =
    | BrowserCrawlingContext<Dictionary>
    | CheerioCrawlingContext<Dictionary>
    | PlaywrightCrawlingContext<Dictionary>
    | PuppeteerCrawlingContext<Dictionary>;

export interface EngineOptions {
    minConcurrency?: number;
    maxConcurrency?: number;
    maxRequestRetries?: number;
    requestHandlerTimeoutSecs?: number;
    requestHandler?: (context: CrawlingContext) => Promise<any> | void;
    failedRequestHandler?: (context: CrawlingContext, error: Error) => Promise<any> | void;
    maxRequestsPerCrawl?: number;
    maxRequestTimeout?: number;
    navigationTimeoutSecs?: number;
    requestQueueName?: string;
    requestQueue?: RequestQueue;
    autoscaledPoolOptions?: {
        isFinishedFunction: () => Promise<boolean>;
    };
    launchContext?: {
        launchOptions?: {
            args?: string[];
            defaultViewport?: {
                width: number;
                height: number;
            };
        };
    };
    preNavigationHooks?: ((context: CrawlingContext) => Promise<any>)[];
    additionalMimeTypes?: string[];
    keepAlive?: boolean;
    proxyConfiguration?: ProxyConfiguration;
    maxSessionRotations?: number;
    useSessionPool?: boolean;
    persistCookiesPerSession?: boolean;
    headless?: boolean;
}

/**
 * Lightweight BaseEngine abstract class
 * Delegates responsibilities to specialized classes
 */
export abstract class BaseEngine {
    protected options: EngineOptions = {};
    protected queue: RequestQueue | undefined = undefined;
    protected abstract engine: any;
    protected abstract isInitialized: boolean;

    // Composition over inheritance - use specialized classes
    protected dataExtractor = new DataExtractor();
    protected jobManager = new JobManager();

    /**
     * Determine if the status code falls within a specific category
     * @param status - Response status object
     * @param category - Base category number (e.g., 200 for success, 400 for client error)
     * @returns true if status code is within the category range (category to category+99)
     */
    protected isStatusInCategory(status: ResponseStatus, category: HttpStatusCategory): boolean {
        return status.statusCode >= category && status.statusCode < category + 100;
    }

    /**
     * Check if the response indicates a successful request
     * Status code range: 200-299
     * Common codes:
     * - 200: OK
     * - 201: Created
     * - 204: No Content
     */
    protected isSuccessfulResponse(status: ResponseStatus): boolean {
        return this.isStatusInCategory(status, HttpStatusCategory.SUCCESS);
    }

    /**
     * Check if the response indicates a client error
     * Status code range: 400-499
     * Common codes:
     * - 400: Bad Request
     * - 401: Unauthorized
     * - 403: Forbidden
     * - 404: Not Found
     * - 429: Too Many Requests
     */
    protected isClientError(status: ResponseStatus): boolean {
        return this.isStatusInCategory(status, HttpStatusCategory.CLIENT_ERROR);
    }

    /**
     * Check if the response indicates a server error
     * Status code range: 500-599
     * Common codes:
     * - 500: Internal Server Error
     * - 502: Bad Gateway
     * - 503: Service Unavailable
     * - 504: Gateway Timeout
     */
    protected isServerError(status: ResponseStatus): boolean {
        return this.isStatusInCategory(status, HttpStatusCategory.SERVER_ERROR);
    }

    /**
     * Get a descriptive error message for the response status
     */
    protected getErrorMessage(status: ResponseStatus): string {
        if (status.statusCode === HttpStatusCategory.NO_RESPONSE) {
            return 'No response received from server';
        }

        const defaultMessage = `Request failed with status: ${status.statusCode} ${status.statusMessage}`;
        return defaultMessage;
    }

    /**
     * Extract status information from different types of responses
     * Handles both function-style (Puppeteer/Playwright) and property-style (Cheerio/Got) responses
     * @param response - The crawler response object or null
     * @returns Normalized response status with code and message
     */
    protected extractResponseStatus(response: CrawlerResponse | null): ResponseStatus {
        if (!response) {
            return {
                statusCode: HttpStatusCategory.NO_RESPONSE,
                statusMessage: 'No response received'
            };
        }

        let statusCode: number;
        let statusMessage: string;

        try {
            // Handle both function-style and property-style status access
            if (typeof response.status === 'function') {
                // Playwright/Puppeteer style
                statusCode = response.status();
                if (typeof response.statusText === 'function') {
                    statusMessage = response.statusText();
                } else {
                    statusMessage = (response.statusText && typeof response.statusText === 'string')
                        ? response.statusText
                        : `HTTP ${statusCode}`;
                }
            } else {
                // Cheerio/Got style - handle multiple possible property names
                statusCode = response.statusCode ?? response.status ?? HttpStatusCategory.NO_RESPONSE;

                if (response.statusMessage && typeof response.statusMessage === 'string') {
                    statusMessage = response.statusMessage;
                } else if (typeof response.statusText === 'function') {
                    statusMessage = response.statusText();
                } else if (response.statusText && typeof response.statusText === 'string') {
                    statusMessage = response.statusText;
                } else {
                    statusMessage = ``;
                }
            }

            // Validate status code
            if (typeof statusCode !== 'number' || statusCode < 0) {
                statusCode = HttpStatusCategory.NO_RESPONSE;
                statusMessage = 'Invalid status code received';
            }

        } catch (error) {
            // If we can't extract status info, log the error and return default
            log.debug(`Failed to extract response status: ${error}`);
            return {
                statusCode: HttpStatusCategory.NO_RESPONSE,
                statusMessage: 'Failed to extract response status'
            };
        }

        return { statusCode, statusMessage };
    }

    /**
     * Create a structured error object
     */
    protected createCrawlerError(
        type: CrawlerErrorType,
        message: string,
        url: string,
        details?: {
            code?: number;
            stack?: string;
            metadata?: Record<string, any>;
        }
    ): CrawlerError {
        if (process.env.NODE_ENV === 'production') {
            delete details?.stack;
        }
        return {
            type,
            message,
            url,
            ...details
        };
    }

    /**
     * Handle failed requests with proper error reporting
     * Specifically handles HTTP-related failures (status codes, network issues)
     */
    protected async handleFailedRequest(
        context: CrawlingContext,
        status: ResponseStatus,
        data?: any,
        tryExtractData = false
    ): Promise<void> {
        if (tryExtractData) {
            let extractedData = {};
            // try to extract data
            try {
                extractedData = await this.dataExtractor.extractData(context);
                data = {
                    ...data,
                    ...extractedData
                }
            } catch (error) {
            }
        }
        const { jobId, queueName } = context.request.userData;
        let error = null;
        if (status.statusCode === 0) {
            error = this.createCrawlerError(
                CrawlerErrorType.HTTP_ERROR,
                `Page is not available`,
                context.request.url,
            );
        } else {
            error = this.createCrawlerError(
                CrawlerErrorType.HTTP_ERROR,
                `Page is not available: ${status.statusCode} ${status.statusMessage}`,
                context.request.url,
                {
                    code: status.statusCode,
                    metadata: {
                        ...data,
                        statusCode: status.statusCode,
                        statusMessage: status.statusMessage
                    }
                }
            );
        }

        if (jobId) {
            await this.jobManager.markFailed(
                jobId,
                queueName,
                error.message,
                {
                    ...error,
                    ...error.metadata
                }
            );
        }

        log.error(`[${queueName}] [${jobId}] ${error.message} (${error.type})`);
    }

    /**
     * Handle errors that occur during data extraction
     * Specifically handles parsing, validation, and extraction process errors
     */
    protected async handleExtractionError(
        context: CrawlingContext,
        originalError: Error
    ): Promise<void> {
        const { jobId, queueName } = context.request.userData;
        const error = this.createCrawlerError(
            CrawlerErrorType.EXTRACTION_ERROR,
            `Data extraction failed: ${originalError.message}`,
            context.request.url,
            {
                stack: originalError.stack
            }
        );

        if (jobId) {
            await this.jobManager.markFailed(
                jobId,
                queueName,
                error.message,
                error
            );
        }

        log.error(`[${queueName}] [${jobId}] ${error.message} (${error.type})`);
        if (error.stack) {
            log.debug(`Error stack: ${error.stack}`);
        }
    }

    constructor(options: EngineOptions = {}) {
        // Validate options using ConfigValidator
        ConfigValidator.validate(options);

        // Initialize storage
        Utils.getInstance().setStorageDirectory();

        // Set default options
        this.options = {
            maxRequestRetries: 2,
            requestHandlerTimeoutSecs: 30,
            ...options,
        };

        // Set the request queue if provided
        this.queue = options.requestQueue;
    }

    /**
     * Create common request and failed request handlers
     */
    protected createCommonHandlers(
        customRequestHandler?: (context: CrawlingContext) => Promise<any> | void,
        customFailedRequestHandler?: (context: CrawlingContext, error: Error) => Promise<any> | void
    ) {
        const checkHttpError = async (context: CrawlingContext) => {
            if (context.response) {
                const status = this.extractResponseStatus(context.response as CrawlerResponse);
                if (!this.isSuccessfulResponse(status)) {
                    await this.handleFailedRequest(context, status, null, true);
                    return true;
                }
            }
            return false;
        }

        const requestHandler = async (context: CrawlingContext) => {
            // check if http status code is 400 or higher
            const isHttpError = await checkHttpError(context);
            let data = null;
            try {
                // check if waitFor is set, and it is browser engine
                if (context.request.userData.options?.waitFor) {
                    if (context.page) {
                        log.debug(`Waiting for ${context.request.userData.options.waitFor} seconds for ${context.request.url}`);
                        await sleep(context.request.userData.options.waitFor);
                    } else {
                        log.warning(`'waitFor' option is not supported for non-browser crawlers. URL: ${context.request.url}`);
                    }
                }

                // Run custom handler if provided
                if (customRequestHandler) {
                    await customRequestHandler(context);
                    return;
                }

                // Extract data using DataExtractor
                data = await this.dataExtractor.extractData(context);

            } catch (error) {
                const { queueName, jobId } = context.request.userData;
                if (jobId) {
                    await this.handleExtractionError(
                        context,
                        error as Error
                    );
                }
                this.dataExtractor.handleExtractionError(context, error as Error);
            }
            const { queueName, jobId } = context.request.userData;

            // Log success
            log.info(`[${queueName}] [${jobId}] Pushing data for ${data.url}`);

            // Update job status if jobId exists
            if (jobId) {
                if (isHttpError) {
                    const status = this.extractResponseStatus(context.response as CrawlerResponse);
                    await this.handleFailedRequest(context, status, data);
                } else {
                    await this.jobManager.markCompleted(jobId, queueName, data);
                }
            }
        };

        const failedRequestHandler = async (context: CrawlingContext, error: Error) => {
            // Run custom handler if provided
            if (customFailedRequestHandler) {
                await customFailedRequestHandler(context, error);
                return;
            }

            const status = this.extractResponseStatus(context.response as CrawlerResponse);

            await this.handleFailedRequest(context, status, error, true);
        };

        return { requestHandler, failedRequestHandler };
    }

    /**
     * Apply engine-specific configurations using EngineConfigurator
     */
    protected applyEngineConfigurations(crawlerOptions: any, engineType: ConfigurableEngineType): any {
        return EngineConfigurator.configure(crawlerOptions, engineType);
    }

    /**
     * Run the crawler
     */
    async run(): Promise<void> {
        if (!this.isInitialized) {
            await this.init();
        }

        if (!this.engine) {
            throw new Error("Engine not initialized");
        }

        const queueName = this.options.requestQueueName || 'default';

        try {
            log.info(`[${queueName}] Starting crawler engine`);
            await this.engine.run();
            log.info(`[${queueName}] Crawler engine started successfully`);
        } catch (error) {
            log.error(`[${queueName}] Error running crawler: ${error}`);
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
     */
    isEngineInitialized(): boolean {
        return this.isInitialized;
    }

    /**
     * Abstract method for engine initialization
     */
    abstract init(): Promise<void>;
} 