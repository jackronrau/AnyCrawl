import { Configuration, KeyValueStore, log } from "crawlee";
import { join } from "path";
import {
  RequestQueue,
  BrowserCrawlingContext,
  CheerioCrawlingContext,
  PlaywrightCrawlingContext,
  PuppeteerCrawlingContext,
  Dictionary,
} from "crawlee";
import { Utils } from "../Utils.js";
import { QueueManager, QueueName } from "../managers/Queue.js";

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
  requestHandler?: (context: CrawlingContext) => Promise<any>;
  failedRequestHandler?: (context: CrawlingContext) => Promise<any>;
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
    };
  };
  preNavigationHooks?: ((context: CrawlingContext) => Promise<any>)[];
  additionalMimeTypes?: string[];
  keepAlive?: boolean;
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

  /**
   * Update the job status to completed and store the data
   * @param jobId The job ID
   * @param queueName The queue name
   * @param data The data to store
   */
  public async doneJob(jobId: string, queueName: QueueName, data: any) {
    // update status to done
    const job = await QueueManager.getInstance().getJob(queueName, jobId);
    if (!job) {
      log.error(`[${queueName}] Job ${jobId} not found in queue.`);
      return;
    }
    job.updateData({
      ...job.data,
      status: "completed",
      ...data,
    });
    await (await Utils.getInstance().getKeyValueStore()).setValue(jobId, data);
  }

  /**
   * Update the job status to failed
   * @param jobId The job ID
   * @param queueName The queue name
   * @param error The error message
   */
  public async failedJob(jobId: string, queueName: QueueName, error: string) {
    // update status to failed
    const job = await QueueManager.getInstance().getJob(queueName, jobId);
    if (!job) {
      log.error(`[${queueName}] Job ${jobId} not found in queue.`);
      return;
    }
    job.updateData({
      ...job.data,
      status: "failed",
      error,
    });
  }
}
