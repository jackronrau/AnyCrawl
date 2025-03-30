import { CheerioEngine } from "./engines/Cheerio.js";
import { CheerioCrawlingContext, Dictionary, log, RequestQueueV2 } from "crawlee";
import { QueueManager, WorkerManager } from "./queue/index.js";
import { Job } from "bullmq";
import { randomUUID } from "node:crypto";

// Initialize the request queue
const requestQueue = await RequestQueueV2.open('scrape_queue');
log.info('Request queue initialized');

// Initialize the CheerioEngine with default settings
const engine = new CheerioEngine({
    maxConcurrency: 50,
    maxRequestRetries: 1,
    requestHandlerTimeoutSecs: 30,
    requestQueue: requestQueue,
    autoscaledPoolOptions: {
        isFinishedFunction: async () => false
    },
    failedRequestHandler: (context: CheerioCrawlingContext<Dictionary>) => {
        const { request, error } = context;
        log.error(`Request ${request.url} failed with error: ${error}`);
    }
});

// Initialize the application
(async () => {
    try {
        log.info('Initializing engine...');
        await engine.init();
        log.info('Engine initialized successfully');

        // Start the worker to handle new URLs
        log.info('Starting worker...');
        await Promise.all([
            WorkerManager.getInstance().getWorker('scrape', async (job: Job) => {
                log.info(`Processing scraping job for URL: ${job.data.url}`);
                await requestQueue.addRequest({
                    url: job.data.url,
                    uniqueKey: randomUUID().toString() + '-' + job.data.url,
                });
                log.info(`Added URL to queue: ${job.data.url}`);
            }),
        ]);
        log.info('Worker started successfully');

        // Check queue status periodically
        setInterval(async () => {
            try {
                const queueInfo = await requestQueue.getInfo();
                if (queueInfo) {
                    log.info(`Queue status - requests: ${queueInfo.pendingRequestCount}, handled: ${queueInfo.handledRequestCount}`);
                }
            } catch (error) {
                log.error(`Error checking queue status: ${error}`);
            }
        }, 3000); // Check every 3 seconds

        // Start the crawler in the background
        log.info('Starting crawler...');
        engine.run().catch(error => {
            log.error(`Error in crawler: ${error}`);
        });
        log.info('Crawler started in background');

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            log.info('Received SIGINT signal, stopping crawler...');
            await engine.stop();
            process.exit(0);
        });

        // Keep the process running
        process.stdin.resume();
    } catch (error) {
        log.error(`Failed to start scraping worker: ${error}`);
        process.exit(1);
    }
})();
