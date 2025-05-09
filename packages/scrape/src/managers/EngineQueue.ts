import { randomUUID } from "node:crypto";
import { CheerioEngine } from "../engines/Cheerio.js";
import { CrawlingContext, Dictionary, LaunchContext, log, RequestQueueV2 } from "crawlee";
import { Utils } from "../Utils.js";
import { PlaywrightEngine } from "../engines/Playwright.js";
import { PuppeteerEngine } from "../engines/Puppeteer.js";
import { BaseEngine, EngineOptions } from "../engines/Base.js";

// Define available engine types
export const AVAILABLE_ENGINES = ["playwright", "cheerio", "puppeteer"] as const;

export type Engine = PlaywrightEngine | PuppeteerEngine | CheerioEngine;

// Define engine type
export type EngineType = (typeof AVAILABLE_ENGINES)[number];

const defaultOptions: EngineOptions = {
  maxConcurrency: process.env.MAX_CONCURRENCY ? parseInt(process.env.MAX_CONCURRENCY) : 50,
  minConcurrency: process.env.MIN_CONCURRENCY ? parseInt(process.env.MIN_CONCURRENCY) : 50,
  maxRequestRetries: 1,
  requestHandlerTimeoutSecs: 60,
  preNavigationHooks: [
    async ({ request, page }) => {
      // pre navigation hook, you can set extra headers, cookies, etc.
      // TODO block media requests
    },
  ],
};

const defaultLaunchContext: Partial<LaunchContext> = {
  launchOptions: {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
};

// Queue manager class to handle all engine queues
export class EngineQueueManager {
  private static instance: EngineQueueManager;
  private queues: Map<string, RequestQueueV2> = new Map();
  private engines: Map<string, Engine> = new Map();

  private constructor() {}

  async getAvailableEngines(): Promise<EngineType[]> {
    return [...AVAILABLE_ENGINES];
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

      let engine: Engine = await this.createEngine(engineType, queue);

      // Ensure the queue is set before initialization
      await engine.init();
      this.engines.set(engineType, engine);
      log.info(`Initialized engine for ${engineType}`);
    }
  }

  /**
   * create engine
   * @param engineType engine type
   * @param queue request queue
   * @param options engine options
   * @returns engine
   */
  async createEngine(
    engineType: string,
    queue: RequestQueueV2,
    options?: EngineOptions
  ): Promise<Engine> {
    switch (engineType) {
      case "cheerio":
        return this.createCheerioEngine(queue, options);
      case "playwright":
        return this.createPlaywrightEngine(queue, options);
      case "puppeteer":
        return this.createPuppeteerEngine(queue, options);
      default:
        throw new Error(`Unknown engine type: ${engineType}`);
    }
  }

  /**
   * create cheerio engine
   * @param queue request queue
   * @param options engine options
   * @returns CheerioEngine
   */
  async createCheerioEngine(
    queue: RequestQueueV2,
    options?: EngineOptions
  ): Promise<CheerioEngine> {
    const engine = new CheerioEngine({
      ...defaultOptions,
      requestQueue: queue,
      failedRequestHandler: async (context: CrawlingContext<Dictionary>) => {
        const { request, error } = context;
        log.error(`Request ${request.url} failed with error: ${error}`);
      },
      additionalMimeTypes: ["text/html", "text/plain", "application/xhtml+xml"],
      ...options,
    });
    return engine;
  }

  /**
   *  reate playwright engine
   * @param queue request queue
   * @param options engine options
   * @returns PlaywrightEngine
   */
  async createPlaywrightEngine(
    queue: RequestQueueV2,
    options?: EngineOptions
  ): Promise<PlaywrightEngine> {
    const engine = new PlaywrightEngine({
      ...defaultOptions,
      requestQueue: queue,
      failedRequestHandler: async (context: CrawlingContext<Dictionary>) => {
        const { request, error } = context;
        log.error(`Request ${request.url} failed with error: ${error}`);
      },
      launchContext: defaultLaunchContext,
      ...options,
    });
    return engine;
  }

  /**
   * create puppeteer engine
   * @param queue Request Queue
   * @param options Engine Options
   * @returns PuppeteerEngine
   */
  async createPuppeteerEngine(
    queue: RequestQueueV2,
    options?: EngineOptions
  ): Promise<PuppeteerEngine> {
    const engine = new PuppeteerEngine({
      ...defaultOptions,
      requestQueue: queue,
      failedRequestHandler: async (context: CrawlingContext<Dictionary>) => {
        const { request, error } = context;
        log.error(`Request ${request.url} failed with error: ${error}`);
      },
      launchContext: defaultLaunchContext,
      ...options,
    });
    return engine;
  }

  async startEngines(): Promise<void> {
    // Start all engines
    for (const [engineType, engine] of this.engines) {
      try {
        log.info(`Starting crawler for ${engineType}...`);
        engine.run().then(() => {});
      } catch (error) {
        log.error(`Error starting crawler for ${engineType}: ${error}`);
        throw error;
      }
    }
  }

  async getEngine(engineType: string): Promise<Engine> {
    const engine = this.engines.get(engineType);
    if (!engine) {
      throw new Error(`Engine not found for ${engineType}`);
    }
    return engine;
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
    const uniqueKey = randomUUID().toString() + "-" + url;
    await queue.addRequest({
      url,
      uniqueKey,
      userData,
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
