
import { QueueManager, WorkerManager } from "./queue/index.js";
import { Job } from "bullmq";
import { EngineQueueManager, AVAILABLE_ENGINES } from "./Manager.js";
import { log } from "crawlee";


const queueManager = EngineQueueManager.getInstance();

// Initialize queues and engines
log.info('Initializing queues and engines...');
await queueManager.initializeQueues();
await queueManager.initializeEngines();
await queueManager.startEngines();
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

                await queueManager.addRequest(engineType, job.data.url);
            }),
        ]);
        log.info('Worker started successfully');

        // Check queue status periodically for all engines
        setInterval(async () => {
            for (const engineType of AVAILABLE_ENGINES) {
                try {
                    const queueInfo = await queueManager.getQueueInfo(engineType);
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
            await queueManager.stopEngines();

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
