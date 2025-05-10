import { Request, Response } from "express";
import { z } from "zod";
import { SearchService } from "@anycrawl/search/SearchService";
import { log } from "@anycrawl/libs/log";
import { searchSchema } from "../../types/SearchSchema.js";

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

    public handle = async (req: Request, res: Response): Promise<void> => {
        try {
            // Validate request body against searchSchema
            const validatedData = searchSchema.parse(req.body);

            // Execute search and wait for results
            const results = await this.searchService.search(validatedData.engine ?? "google", {
                query: validatedData.query,
                limit: validatedData.limit || 10,
                offset: validatedData.offset || 0,
                pages: validatedData.pages || 1,
                lang: validatedData.lang,
                // country: validatedData.country,
            });

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
                res.status(500).json({
                    success: false,
                    error: "Internal server error",
                    message: error instanceof Error ? error.message : "Unknown error occurred",
                });
            }
        }
    };
}
