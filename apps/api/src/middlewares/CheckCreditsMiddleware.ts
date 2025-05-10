import { Response, NextFunction } from "express";
import { getDB, schemas } from "../db/index.js";
import { eq } from "drizzle-orm";
import { RequestWithAuth } from "../types/Types.js";
import { log } from "@anycrawl/libs/log";

export const checkCreditsMiddleware = async (
    req: RequestWithAuth,
    res: Response,
    next: NextFunction
): Promise<void> => {
    // Skip credits check if auth is disabled
    if (process.env.ANYCRAWL_API_AUTH_ENABLED !== "true") {
        next();
        return;
    }

    try {
        // Get current credits from auth user
        const credits = req.auth?.credits || 0;

        // Check if user has any credits
        if (credits <= 0) {
            res.status(402).json({
                success: false,
                error: "Insufficient credits",
            });
            return;
        }

        next();
    } catch (error) {
        log.error(`Error checking credits: ${error}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
        return;
    }
};
