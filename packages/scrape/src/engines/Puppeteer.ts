import { htmlToMarkdown } from "@repo/libs/html-to-markdown";
import { BaseEngine, EngineOptions } from "./Base.js";
import {
  BrowserName,
  DeviceCategory,
  Dictionary,
  PuppeteerCrawler,
  PuppeteerCrawlingContext,
  log,
} from "crawlee";

export class PuppeteerEngine extends BaseEngine {
  protected engine: PuppeteerCrawler | null = null;
  protected isInitialized: boolean = false;
  protected customRequestHandler?: (context: PuppeteerCrawlingContext<Dictionary>) => Promise<void>;
  protected customFailedRequestHandler?: (params: PuppeteerCrawlingContext<Dictionary>) => void;

  constructor(options: EngineOptions = {}) {
    super(options);
    this.customRequestHandler = options.requestHandler;
    this.customFailedRequestHandler = options.failedRequestHandler;
    this.queue = options.requestQueue;
  }
  /**
   * Initialize the crawler engine
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.queue) {
      throw new Error("Request queue not set for Playwright engine");
    }

    const defaultRequestHandler = async (context: PuppeteerCrawlingContext<Dictionary>) => {
      const { request, page } = context;
      const jobId = request.userData["jobId"];
      // Get page content
      const title = await page.title();
      const html = await page.content();

      // Get metadata
      const metadata = await page.evaluate(() => {
        const metaElements = document.querySelectorAll("meta");
        const metaData: Record<string, string> = {};
        metaElements.forEach((el) => {
          const name = el.getAttribute("name") || el.getAttribute("property");
          const content = el.getAttribute("content");
          if (name && content) {
            metaData[name] = content;
          }
        });
        return metaData;
      });

      const data = {
        job_id: jobId,
        url: request.url,
        title,
        html,
        markdown: htmlToMarkdown(html),
        metadata,
        timestamp: new Date().toISOString(),
      };

      log.info(
        `[${request.userData["queueName"]}] Pushing data for ${request.url}, jobId: ${jobId}`
      );
      return data;
    };

    const defaultFailedRequestHandler = (context: PuppeteerCrawlingContext<Dictionary>) => {
      log.error(`[${context.request.userData["queueName"]}] Request ${context.request.url} failed`);
    };

    const requestHandler = async (context: PuppeteerCrawlingContext<Dictionary>) => {
      try {
        let data: Record<string, any> = {};
        if (this.customRequestHandler) {
          await this.customRequestHandler(context);
          // If custom handler doesn't return data, use default handler
          data = await defaultRequestHandler(context);
        } else {
          data = await defaultRequestHandler(context);
        }
        await this.doneJob(
          context.request.userData["jobId"],
          context.request.userData["queueName"],
          data
        );
      } catch (error) {
        log.error(
          `[${context.request.userData["queueName"]}] Error processing request ${context.request.url}: ${error}`
        );
        throw error;
      }
    };

    const failedRequestHandler = async (
      context: PuppeteerCrawlingContext<Dictionary>,
      error: Error
    ) => {
      if (this.customFailedRequestHandler) {
        await this.customFailedRequestHandler(context);
      } else {
        await defaultFailedRequestHandler(context);
      }
      await this.failedJob(
        context.request.userData["jobId"],
        context.request.userData["queueName"],
        error.message
      );
    };

    const crawlerOptions = {
      ...this.options,
      requestHandler,
      failedRequestHandler,
      headless: process.env.HEADLESS === "false" ? false : true,
    };
    crawlerOptions.autoscaledPoolOptions = {
      isFinishedFunction: async () => {
        return false;
      },
    };
    // crawlerOptions.preNavigationHooks, to set custom headers and so on.

    this.engine = new PuppeteerCrawler(crawlerOptions);
    this.isInitialized = true;
  }

  /**
   * Get the underlying CheerioCrawler instance
   * @returns The CheerioCrawler instance
   */
  getEngine(): PuppeteerCrawler {
    if (!this.engine) {
      throw new Error("Engine not initialized. Call init() first.");
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
      throw new Error("Engine not initialized");
    }

    try {
      log.info("Starting crawler engine...");
      await this.engine.run();
      log.info("Crawler engine started successfully");
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
