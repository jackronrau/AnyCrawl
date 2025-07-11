import { Response } from "express";
import { z } from "zod";
import { scrapeSchema } from "../../types/ScrapeSchema.js";
import { QueueManager, CrawlerErrorType } from "@anycrawl/scrape";
import { RequestWithAuth } from "../../types/Types.js";

export class ScrapeController {
    public handle = async (req: RequestWithAuth, res: Response): Promise<void> => {
        try {
            // Validate request body and transform it to the job payload structure
            const jobPayload = scrapeSchema.parse(req.body);

            const jobId = await QueueManager.getInstance().addJob(`scrape-${jobPayload.engine}`, jobPayload);
            // waiting job done
            const job = await QueueManager.getInstance().waitJobDone(`scrape-${jobPayload.engine}`, jobId, jobPayload.options.timeout || 60_000);
            const { uniqueKey, queueName, options, engine, ...jobData } = job;
            // Check if job failed
            if (job.status === 'failed' || job.error) {
                res.status(200).json({
                    success: false,
                    error: "Scrape task failed",
                    message: job.message || "The scraping task could not be completed",
                    data: {
                        ...jobData,
                    }
                });
                return;
            }

            // Set credits used for this scrape request (1 credit per scrape)
            req.creditsUsed = 1;

            // Add domain prefix to screenshot path if it exists
            if (jobData.screenshot) {
                jobData.screenshot = `${process.env.ANYCRAWL_DOMAIN}/v1/public/storage/file/${jobData.screenshot}`;
            }

            res.json({
                success: true,
                data: jobData,
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
}
