import { WorkerManager } from "./managers/Worker.js";
import { QueueManager } from "./managers/Queue.js";
import { Job } from "bullmq";
import { EngineQueueManager, AVAILABLE_ENGINES } from "./managers/EngineQueue.js";
import { log } from "crawlee";
import { Utils } from "./Utils.js";
import { randomUUID } from "crypto";

// Initialize Utils first
const utils = Utils.getInstance();
await utils.initializeKeyValueStore();

// Initialize queues and engines
log.info('Initializing queues and engines...');
const engineQueueManager = EngineQueueManager.getInstance();
await engineQueueManager.initializeQueues();
await engineQueueManager.initializeEngines();

// Initialize QueueManager
QueueManager.getInstance();
log.info('All queues and engines initialized and started');

// Initialize the application
(async () => {
    try {
        // Start the worker to handle new URLs
        log.info('Starting worker...');
        await Promise.all([
            WorkerManager.getInstance().getWorker('scrape', async (job: Job) => {
                const engineType = job.data.engine || 'cheerio';
                if (!AVAILABLE_ENGINES.includes(engineType)) {
                    throw new Error(`Unsupported engine type: ${engineType}`);
                }
                log.info(`Processing scraping job for URL: ${job.data.url} with engine: ${engineType}`);
                const uniqueKey = await engineQueueManager.addRequest(engineType, job.data.url, {
                    jobId: job.id,
                    queueName: 'scrape',
                    type: 'scrape',
                    options: job.data.options || {}
                });
                job.updateData({
                    ...job.data,
                    uniqueKey,
                    status: 'processing'
                });
            }),
        ]);
        log.info('Worker started successfully');

        // Check queue status periodically for all engines
        setInterval(async () => {
            for (const engineType of AVAILABLE_ENGINES) {
                try {
                    const queueInfo = await engineQueueManager.getQueueInfo(engineType);
                    if (queueInfo) {
                        log.info(`Queue status for ${engineType} - requests: ${queueInfo.pendingRequestCount}, handled: ${queueInfo.handledRequestCount}`);
                    }
                } catch (error) {
                    log.error(`Error checking queue status for ${engineType}: ${error}`);
                }
            }
        }, 3000); // Check every 3 seconds

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            log.info('Received SIGINT signal, stopping all crawlers...');
            // Temporarily disable console.warn to prevent the pause message
            const originalWarn = console.warn;
            console.warn = () => { };

            // Stop all engines
            await engineQueueManager.stopEngines();

            // Restore console.warn
            console.warn = originalWarn;

            process.exit(0);
        });

        // Keep the process running
        process.stdin.resume();
    } catch (error) {
        log.error(`Failed to start scraping worker: ${error}`);
        process.exit(1);
    }
})();
await engineQueueManager.startEngines();

