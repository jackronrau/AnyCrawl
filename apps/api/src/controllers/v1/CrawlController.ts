import { Response } from "express";
import { z } from "zod";
import { crawlSchema } from "../../types/CrawlSchema.js";
import { QueueManager, CrawlerErrorType, RequestTask } from "@anycrawl/scrape";
import { RequestWithAuth } from "../../types/Types.js";
import { randomUUID } from "crypto";
import { cancelJob, createJob, getJob } from "../../utils/job.js";
import { CrawlSchemaInput } from "../../types/CrawlSchema.js";

export class CrawlController {
    /**
     * Start a crawl job
     */
    public start = async (req: RequestWithAuth, res: Response): Promise<void> => {
        try {
            // Validate request body
            const jobPayload = crawlSchema.parse(req.body);

            // Add job to queue
            const jobId = await QueueManager.getInstance().addJob(`crawl-${jobPayload.engine}`, jobPayload);

            req.creditsUsed = 0;

            await createJob({
                job_id: jobId,
                job_type: 'crawl',
                job_queue_name: `crawl-${jobPayload.engine}`,
                url: jobPayload.url,
                req,
            });

            // Return immediately with job ID (async processing)
            res.json({
                success: true,
                data: {
                    job_id: jobId,
                    status: 'created',
                    message: 'Crawl job has been queued for processing',
                }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                const formattedErrors = error.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                    code: err.code,
                }));
                const message = error.errors.map((err) => err.message).join(", ");
                res.status(400).json({
                    success: false,
                    error: "Validation error",
                    message: message,
                    data: {
                        type: CrawlerErrorType.VALIDATION_ERROR,
                        issues: formattedErrors,
                        message: message,
                        status: 'failed',
                    },
                });
            } else {
                const message = error instanceof Error ? error.message : "Unknown error occurred";
                res.status(500).json({
                    success: false,
                    error: "Internal server error",
                    message: message,
                    data: {
                        type: CrawlerErrorType.INTERNAL_ERROR,
                        message: message,
                        status: 'failed',
                    },
                });
            }
        }
    };

    /**
     * Get crawl job status
     */
    public status = async (req: RequestWithAuth, res: Response): Promise<void> => {
        try {
            const { jobId } = req.params;

            // validate uuid
            const parseResult = CrawlSchemaInput.safeParse({ uuid: jobId });
            if (!parseResult.success) {
                res.status(400).json({
                    success: false,
                    error: "Invalid job ID",
                    message: "Job ID must be a valid UUID"
                });
                return;
            }

            if (!jobId) {
                res.status(400).json({
                    success: false,
                    error: "Invalid job ID",
                    message: "Job ID must be a valid crawl job identifier"
                });
                return;
            }

            const job = await getJob(jobId);
            if (!job) {
                res.status(400).json({
                    success: false,
                    error: "Not found",
                    message: "Job not found"
                });
                return;
            }
            const queueJob = await QueueManager.getInstance().getJob(job.jobQueueName, jobId);
            // create job status for response
            const jobStatus = {
                job_id: jobId,
                status: job.status,
                start_time: new Date().toISOString(),
                expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
                credits_used: job.creditsUsed ?? 0,
                total: job.total ?? 0,
                completed: job.completed ?? 0,
                failed: job.failed ?? 0,
                data: job.jobResults ?? []
            };

            res.json({
                success: true,
                message: 'Job status retrieved successfully',
                data: jobStatus
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error occurred";
            res.status(500).json({
                success: false,
                error: "Internal server error",
                message: message
            });
        }
    };
    /**
     * Cancel a crawl job
     * @param req - The request object
     * @param res - The response object
     * @returns
     */
    public cancel = async (req: RequestWithAuth, res: Response): Promise<void> => {
        try {
            const { jobId } = req.params;
            // validate uuid
            const parseResult = CrawlSchemaInput.safeParse({ uuid: jobId });
            if (!parseResult.success) {
                res.status(400).json({
                    success: false,
                    error: "Invalid job ID",
                    message: "Job ID must be a valid UUID"
                });
                return;
            }
            if (!jobId) {
                res.status(400).json({
                    success: false,
                    error: "Invalid job ID",
                    message: "Job ID is required"
                });
                return;
            }
            const job = await cancelJob(jobId);
            if (!job) {
                res.status(404).json({
                    success: false,
                    error: "Not found",
                    message: "Job not found"
                });
                return;
            }

            // cancel job in the bullmq queue
            await QueueManager.getInstance().cancelJob(job.jobQueueName, jobId);

            res.status(200).json({
                success: true,
                message: "Job cancelled successfully",
                data: {
                    job_id: job.jobId,
                    status: 'cancelled',
                }
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error occurred";
            res.status(500).json({
                success: false,
                error: "Internal server error",
                message: message
            });
        }
    };
} 