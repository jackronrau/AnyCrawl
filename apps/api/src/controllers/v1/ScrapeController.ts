import { Request, Response } from "express";
import { z } from "zod";
import { scrapeSchema } from "../../types/ScrapeSchema.js";
import { QueueManager } from "@anycrawl/scrape/managers/Queue";

export class ScrapeController {
    public handle = async (req: Request, res: Response): Promise<void> => {
        try {
            // Validate request body against ScrapeSchema
            const validatedData = scrapeSchema.parse(req.body);

            const jobId = await QueueManager.getInstance().addJob("scrape", {
                url: validatedData.url,
                engine: validatedData.engine,
                options: {
                    // TODO support more options
                },
            });
            // waiting job done
            const job = await QueueManager.getInstance().waitJobDone("scrape", jobId);
            const { uniqueKey, queueName, options, engine, ...jobData } = job;
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
                    details: {
                        issues: formattedErrors,
                        message: error.message,
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
