import { Utils } from "../Utils.js";
import { BaseEngine, EngineOptions } from "./Base.js";
import { CheerioCrawler, log, CheerioCrawlingContext, Dictionary, Dataset } from "crawlee";
import { htmlToMarkdown } from "@repo/libs/html-to-markdown";

/**
 * CheerioEngine class for web scraping using Cheerio
 * A lightweight implementation for parsing and extracting data from HTML
 */
export class CheerioEngine extends BaseEngine {
  protected engine: CheerioCrawler | null = null;
  protected isInitialized: boolean = false;
  protected customRequestHandler?: (context: CheerioCrawlingContext<Dictionary>) => Promise<any>;
  protected customFailedRequestHandler?: (
    params: CheerioCrawlingContext<Dictionary>
  ) => Promise<any>;

  /**
   * Constructor for CheerioEngine
   * @param options Optional configuration options for the engine
   */
  constructor(options: EngineOptions = {}) {
    super(options);
    this.customRequestHandler = options.requestHandler;
    this.customFailedRequestHandler = options.failedRequestHandler;
    delete options.requestHandler;
    delete options.failedRequestHandler;
  }

  /**
   * Initialize the crawler engine
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const defaultRequestHandler = async (context: CheerioCrawlingContext<Dictionary>) => {
      const { request, $, body } = context;
      const jobId = request.userData["jobId"];
      let metadata: any[] = [];
      let html = body.toString("utf-8");
      let title = "";

      if (typeof $ === "function") {
        metadata = Object.entries(
          $("meta")
            .toArray()
            .reduce<Record<string, string>>((acc, el) => {
              const $el = $(el);
              const name = $el.attr("name") || $el.attr("property");
              const content = $el.attr("content");
              if (name && content) {
                acc[name] = content;
              }
              return acc;
            }, {})
        ).map(([key, value]) => ({ key, value }));
        html = $("html").html() || body.toString("utf-8");
        title = $("title").text();
      }

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

    const defaultFailedRequestHandler = (context: CheerioCrawlingContext<Dictionary>) => {
      log.error(`[${context.request.userData["queueName"]}] Request ${context.request.url} failed`);
    };

    const requestHandler = async (context: CheerioCrawlingContext<Dictionary>) => {
      try {
        let data = {};
        if (this.customRequestHandler) {
          data = await this.customRequestHandler(context);
        } else {
          data = await defaultRequestHandler(context);
        }
        if (context.request.userData["jobId"]) {
          await this.doneJob(
            context.request.userData["jobId"],
            context.request.userData["queueName"],
            data
          );
        }
      } catch (error) {
        log.error(
          `[${context.request.userData["queueName"]}] Error processing request ${context.request.url}: ${error}`
        );
        throw error;
      }
    };

    const failedRequestHandler = async (
      context: CheerioCrawlingContext<Dictionary>,
      error: Error
    ) => {
      if (this.customFailedRequestHandler) {
        await this.customFailedRequestHandler(context);
      } else {
        await defaultFailedRequestHandler(context);
      }
      if (context.request.userData["jobId"]) {
        await this.failedJob(
          context.request.userData["jobId"],
          context.request.userData["queueName"],
          error.message
        );
      }
    };

    const crawlerOptions = {
      ...this.options,
      requestHandler,
      failedRequestHandler,
    };
    crawlerOptions.autoscaledPoolOptions = {
      isFinishedFunction: async () => {
        return false;
      },
    };

    this.engine = new CheerioCrawler(crawlerOptions);
    this.isInitialized = true;
  }

  /**
   * Get the underlying CheerioCrawler instance
   * @returns The CheerioCrawler instance
   */
  getEngine(): CheerioCrawler {
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
