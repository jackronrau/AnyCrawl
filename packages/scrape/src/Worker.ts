import { WorkerManager } from "./managers/Worker.js";
import { QueueManager } from "./managers/Queue.js";
import { Job } from "bullmq";
import { EngineQueueManager, AVAILABLE_ENGINES, ALLOWED_ENGINES } from "./managers/EngineQueue.js";
import { log } from "crawlee";
import { Utils } from "./Utils.js";
import { randomUUID } from "crypto";

if (process.env.NODE_ENV !== "production") {
    log.setLevel(log.LEVELS.DEBUG);
}

// Initialize Utils first
const utils = Utils.getInstance();
await utils.initializeKeyValueStore();

// Initialize queues and engines
log.info("Initializing queues and engines...");
const engineQueueManager = EngineQueueManager.getInstance();
await engineQueueManager.initializeQueues();
await engineQueueManager.initializeEngines();

// Initialize QueueManager
QueueManager.getInstance();
log.info("All queues and engines initialized and started");

async function runJob(job: Job) {
    const engineType = job.data.engine || "cheerio";
    if (!ALLOWED_ENGINES.includes(engineType)) {
        throw new Error(`Unsupported engine type: ${engineType}`);
    }
    log.info(`Processing scraping job for URL: ${job.data.url} with engine: ${engineType}`);
    const uniqueKey = await engineQueueManager.addRequest(engineType, job.data.url,
        {
            jobId: job.id,
            queueName: job.data.queueName,
            type: job.data.type,
            options: job.data.options || {},//from user input which be inserted into job.data as options
        }//userData
    );
    job.updateData({
        ...job.data,
        uniqueKey,
        status: "processing",
    });
}

// Initialize the application
(async () => {
    try {
        // check redis
        const redisClient = Utils.getInstance().getRedisConnection();
        await redisClient.ping();
        log.info("Redis connection established");
        // Start the worker to handle new URLs
        log.info("Starting worker...");
        await Promise.all(
            // according the available engines, start the worker for each engine
            AVAILABLE_ENGINES.map((engineType) =>
                WorkerManager.getInstance().getWorker(`scrape-${engineType}`, async (job: Job) => {
                    await runJob(job);
                })
            )
        );
        log.info("Worker started successfully");

        // Check queue status periodically for all engines
        setInterval(async () => {
            for (const engineType of AVAILABLE_ENGINES) {
                try {
                    const queueInfo = await engineQueueManager.getQueueInfo(engineType);
                    if (queueInfo) {
                        log.info(
                            `Queue status for ${engineType} - requests: ${queueInfo.pendingRequestCount}, handled: ${queueInfo.handledRequestCount}`
                        );
                    }
                } catch (error) {
                    log.error(`Error checking queue status for ${engineType}: ${error}`);
                }
            }
        }, 3000); // Check every 3 seconds

        // Handle graceful shutdown
        process.on("SIGINT", async () => {
            log.warning("Received SIGINT signal, stopping all crawlers...");
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
