import { Response } from "express";
import { z } from "zod";
import { SearchService } from "@anycrawl/search/SearchService";
import { log } from "@anycrawl/libs/log";
import { searchSchema } from "../../types/SearchSchema.js";
import { RequestWithAuth } from "../../types/Types.js";
import { randomUUID } from "crypto";
import { STATUS, createJob, insertJobResult, completedJob, failedJob, updateJobCounts, JOB_RESULT_STATUS } from "@anycrawl/db";
export class SearchController {
    private searchService: SearchService;

    constructor() {
        this.searchService = new SearchService();
        // Initialize crawler in constructor
        this.initializeCrawler().catch((error) => {
            log.error(`Failed to initialize crawler: ${error}`);
        });
    }

    private async initializeCrawler() {
        try {
            await this.searchService.initializeCrawler();
            log.info("Crawler initialized successfully");
        } catch (error) {
            log.error(`Error initializing crawler: ${error}`);
            throw error;
        }
    }

    public handle = async (req: RequestWithAuth, res: Response): Promise<void> => {
        let jobId: string | null = null;
        let engineName: string | null = null;
        try {
            // Validate request body against searchSchema
            const validatedData = searchSchema.parse(req.body);

            // Execute search and wait for results
            engineName = validatedData.engine ?? "google";

            // Create job for search request (pending)
            jobId = randomUUID();
            await createJob({
                job_id: jobId,
                job_type: "search",
                job_queue_name: `search-${engineName}`,
                url: `search:${validatedData.query}`,
                req,
                status: STATUS.PENDING,
            });
            req.jobId = jobId;

            const expectedPages = validatedData.pages || 1;
            let pagesProcessed = 0;
            let failedPages = 0;
            let successPages = 0;

            const results = await this.searchService.search(engineName, {
                query: validatedData.query,
                limit: validatedData.limit || 10,
                offset: validatedData.offset || 0,
                pages: expectedPages,
                lang: validatedData.lang,
                // country: validatedData.country,
            }, async (page, pageResults, _uniqueKey, success) => {
                try {
                    pagesProcessed += 1;
                    if (!success) {
                        failedPages += 1;
                        // Record a failed page entry (single record per page)
                        await insertJobResult(
                            jobId!,
                            `search:${engineName}:${validatedData.query}:page:${page}`,
                            { page, query: validatedData.query, results: [] },
                            JOB_RESULT_STATUS.FAILED
                        );
                    } else {
                        successPages += 1;
                        // Insert a single record for this page with aggregated results
                        await insertJobResult(
                            jobId!,
                            `search:${engineName}:${validatedData.query}:page:${page}`,
                            { page, query: validatedData.query, results: pageResults },
                            JOB_RESULT_STATUS.SUCCESS
                        );
                    }

                    // Update job counts based on pages for progress
                    await updateJobCounts(jobId!, { total: expectedPages, completed: successPages, failed: failedPages });
                } catch (e) {
                    log.error(`Per-page handler error for job_id=${jobId}: ${e instanceof Error ? e.message : String(e)}`);
                }
            });
            // credits used is the number of pages.
            req.creditsUsed = validatedData.pages ?? 1;

            // Mark job status based on page results
            try {
                if (failedPages >= expectedPages) {
                    await failedJob(
                        jobId,
                        `All pages failed (${failedPages}/${expectedPages})`,
                        false,
                        { total: expectedPages, completed: successPages, failed: failedPages }
                    );
                } else {
                    await completedJob(jobId, true, { total: expectedPages, completed: successPages, failed: failedPages });
                }
            } catch (e) {
                log.error(`Failed to mark job final status for job_id=${jobId}: ${e instanceof Error ? e.message : String(e)}`);
            }
            res.json({
                success: true,
                data: results,
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
                        messages: error.errors.map((err) => err.message),
                    },
                });
            } else {
                if (jobId) {
                    try {
                        await failedJob(jobId, error instanceof Error ? error.message : "Unknown error", false, { total: 0, completed: 0, failed: 0 });
                    } catch (e) {
                        log.error(`Failed to mark job failed for job_id=${jobId}: ${e instanceof Error ? e.message : String(e)}`);
                    }
                }
                res.status(500).json({
                    success: false,
                    error: "Internal server error",
                    message: error instanceof Error ? error.message : "Unknown error occurred",
                });
            }
        }
    };
}
