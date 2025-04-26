
import { randomUUID } from "node:crypto";
import { CheerioEngine } from "../engines/Cheerio.js";
import { CrawlingContext, Dictionary, log, RequestQueueV2 } from "crawlee";
import { Utils } from "../Utils.js";

// Define available engine types
export const AVAILABLE_ENGINES = ['cheerio'];

// Define engine type
export type EngineType = typeof AVAILABLE_ENGINES[number];

// Queue manager class to handle all engine queues
export class EngineQueueManager {
    private static instance: EngineQueueManager;
    private queues: Map<string, RequestQueueV2> = new Map();
    private engines: Map<string, CheerioEngine> = new Map();

    private constructor() {
    }

    static getInstance(): EngineQueueManager {
        if (!EngineQueueManager.instance) {
            EngineQueueManager.instance = new EngineQueueManager();
        }
        return EngineQueueManager.instance;
    }

    async initializeQueues(): Promise<void> {
        // Initialize queues for all available engines
        for (const engineType of AVAILABLE_ENGINES) {
            const queue = await Utils.getInstance().getQueue(engineType);
            this.queues.set(engineType, queue);
        }
    }

    async initializeEngines(): Promise<void> {
        // Initialize engines for all available engines
        for (const engineType of AVAILABLE_ENGINES) {
            const queue = this.queues.get(engineType);
            if (!queue) {
                throw new Error(`Queue not initialized for ${engineType}`);
            }

            let engine;
            switch (engineType) {
                case 'cheerio':
                    engine = new CheerioEngine({
                        maxConcurrency: 50,
                        minConcurrency: 50,
                        maxRequestRetries: 1,
                        requestHandlerTimeoutSecs: 30,
                        requestQueue: queue,
                        failedRequestHandler: (context: CrawlingContext<Dictionary>) => {
                            const { request, error } = context;
                            log.error(`Request ${request.url} failed with error: ${error}`);
                        }
                    });
                    break;
                default:
                    throw new Error(`Unknown engine type: ${engineType}`);
            }

            await engine.init();
            this.engines.set(engineType, engine);
            log.info(`Initialized engine for ${engineType}`);
        }
    }

    async startEngines(): Promise<void> {
        // Start all engines
        for (const [engineType, engine] of this.engines) {
            log.info(`Starting crawler for ${engineType}...`);
            engine.run().catch(error => {
                log.error(`Error in crawler for ${engineType}: ${error}`);
            });
            log.info(`Crawler started in background for ${engineType}`);
        }
    }

    async stopEngines(): Promise<void> {
        // Stop all engines
        for (const [engineType, engine] of this.engines) {
            await engine.stop();
        }
    }

    async addRequest(engineType: string, url: string, userData: object): Promise<string> {
        const queue = this.queues.get(engineType);
        if (!queue) {
            throw new Error(`Queue not found for engine type: ${engineType}`);
        }
        const uniqueKey = randomUUID().toString() + '-' + url
        await queue.addRequest({
            url,
            uniqueKey,
            userData
        });
        log.info(`Added URL to queue: ${url} for engine: ${engineType}`);
        return uniqueKey;
    }

    async getQueueInfo(engineType: string): Promise<any> {
        const queue = this.queues.get(engineType);
        if (!queue) {
            throw new Error(`Queue not found for engine type: ${engineType}`);
        }
        return queue.getInfo();
    }
}