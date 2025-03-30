import { Queue, Worker } from 'bullmq';
import IORedis from "ioredis";
import { log } from 'crawlee';
import { randomUUID } from 'node:crypto';

const redisConnection = new IORedis.default(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
});

export class WorkerManager {
    private static instance: WorkerManager;
    private workers: Map<string, Worker> = new Map();

    private constructor() {
        // Private constructor to enforce singleton pattern
    }

    public static getInstance(): WorkerManager {
        if (!WorkerManager.instance) {
            WorkerManager.instance = new WorkerManager();
        }
        return WorkerManager.instance;
    }
    public async getWorker(name: string, jobHandler: (job: any) => Promise<void>): Promise<Worker> {
        if (!this.workers.has(name)) {
            this.workers.set(name, new Worker(
                name,
                async job => {
                    return await jobHandler(job);
                },
                {
                    connection: redisConnection
                }
            ));
        }
        return this.workers.get(name)!;
    }
}

export class QueueManager {
    private static instance: QueueManager;
    private queues: Map<string, Queue> = new Map();

    private constructor() {
        // Private constructor to enforce singleton pattern
    }

    /**
     * Get the singleton instance of QueueManager
     */
    public static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }

    /**
     * Get or create a queue with the specified name
     * @param name Name of the queue
     * @param age How long to keep completed/failed jobs in seconds
     * @returns Queue instance
     */
    public getQueue(name: string, age: number = 3600): Queue {
        if (!this.queues.has(name)) {
            const queue = new Queue(name, {
                connection: redisConnection,
                defaultJobOptions: {
                    removeOnComplete: {
                        age: age,
                    },
                    removeOnFail: {
                        age: age,
                    },
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    }
                },
            });
            this.queues.set(name, queue);
            log.info(`Queue ${name} created.`);
        }
        return this.queues.get(name)!;
    }

    /**
     * Add a job to a specific queue
     * @param queueName Name of the queue
     * @param jobName Name of the job
     * @param jobId Unique job ID
     * @param data Job data
     */
    public async addJob(queueName: string, jobName: string, jobId: string, data: any): Promise<void> {
        const queue = this.getQueue(queueName);
        await queue.add(jobName, data, {
            jobId,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            }
        });
    }

    /**
     * Get the number of jobs in a specific queue
     * @param queueName Name of the queue
     * @returns Number of jobs in the queue
     */
    public async getJobCount(queueName: string): Promise<number> {
        const queue = this.getQueue(queueName);
        const counts = await queue.getJobCounts();
        return (counts.active || 0) + (counts.waiting || 0) + (counts.delayed || 0);
    }

    /**
     * Close all queues
     */
    public async closeAll(): Promise<void> {
        for (const [name, queue] of this.queues) {
            await queue.close();
            log.info(`Queue ${name} closed.`);
        }
        this.queues.clear();
    }
}
