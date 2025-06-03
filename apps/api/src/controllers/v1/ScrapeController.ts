import { Response } from "express";
import { z } from "zod";
import { scrapeSchema } from "../../types/ScrapeSchema.js";
import { QueueManager } from "@anycrawl/scrape/managers/Queue";
import { RequestWithAuth } from "../../types/Types.js";

export class ScrapeController {
    public handle = async (req: RequestWithAuth, res: Response): Promise<void> => {
        try {
            // Validate request body against ScrapeSchema
            const validatedData = scrapeSchema.parse(req.body);

            const jobId = await QueueManager.getInstance().addJob(`scrape-${validatedData.engine}`, {
                url: validatedData.url,
                engine: validatedData.engine,
                options: {
                    proxy: validatedData.proxy,
                    // TODO support more options
                },
            });
            // waiting job done
            const job = await QueueManager.getInstance().waitJobDone(`scrape-${validatedData.engine}`, jobId);
            const { uniqueKey, queueName, options, engine, ...jobData } = job;

            // Check if job failed
            if (job.status === 'failed' || job.error) {
                res.status(422).json({
                    success: false,
                    error: "Scrape task failed",
                    message: job.error || "The scraping task could not be completed",
                    details: {
                        url: validatedData.url,
                        engine: validatedData.engine,
                        jobId: jobId,
                    }
                });
                return;
            }

            // Set credits used for this scrape request (1 credit per scrape)
            req.creditsUsed = 1;

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

                res.status(400).json({
                    success: false,
                    error: "Validation error",
                    message: error.errors.map((err) => err.message).join(", "),
                    details: {
                        issues: formattedErrors,
                        messages: error.errors.map((err) => err.message),
                    },
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: "Internal server error",
                    message: error instanceof Error ? error.message : "Unknown error occurred",
                });
            }
        }
    };
}
