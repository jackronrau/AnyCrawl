import { log } from 'crawlee';
import { QueueManager } from '../queue/index.js';
import { Queue } from 'bullmq';

/**
 * Class to handle failed tasks
 */
export class FailHandler {
    private static instance: FailHandler;
    private queueManager: QueueManager;
    private queue: Queue;

    /**
     * constructor to enforce singleton pattern
     */
    constructor(queueName: string) {
        this.queueManager = QueueManager.getInstance();
        this.queue = this.queueManager.getQueue(queueName);
    }

    /**
     * Get the singleton instance of FailHandler
     * @returns The FailHandler instance
     */
    public static getInstance(queueName: string): FailHandler {
        if (!FailHandler.instance) {
            FailHandler.instance = new FailHandler(queueName);
        }
        return FailHandler.instance;
    }

    /**
     * Handle a failed task
     * @param taskId The ID of the failed task
     * @param queueName The name of the queue
     * @param data The task data
     * @param error The error that caused the failure
     * @param retryCount The current retry count
     */
    public async handleFailedTask(
        taskId: string,
        queueName: string,
        data: any,
        error: Error,
        retryCount: number = 0
    ): Promise<void> {
        log.error(`Task ${taskId} failed with error: ${error.message}`);
        // move to fail
        await this.queue.moveToFailed({
            message: error.message,
            stack: error.stack,
            data: data,
            failedAt: new Date().toISOString()
        });
    }
}
