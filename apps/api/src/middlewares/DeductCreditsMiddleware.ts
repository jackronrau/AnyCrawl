import { Response, NextFunction } from "express";
import { getDB, schemas } from "../db/index.js";
import { eq, and, gt } from "drizzle-orm";
import { RequestWithAuth } from "../types/Types.js";
import { log } from "@anycrawl/libs/log";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { captureResponseBody, CapturedResponse } from "../utils/responseCapture.js";

// did not need to deduct credits.
const ignoreDeductRoutes: string[] = [

];

// TODO: need to improve this middleware.
export const deductCreditsMiddleware = async (
    req: RequestWithAuth,
    res: Response,
    next: NextFunction
): Promise<void> => {
    // Skip if auth is disabled or credits deduction is disabled.
    if (process.env.ANYCRAWL_API_AUTH_ENABLED !== "true" || process.env.ANYCRAWL_API_CREDITS_ENABLED !== "true") {
        next();
        return;
    }

    // Store the user UUID for later use
    const userUuid = req.auth?.uuid;

    // Register finish event handler to deduct credits
    res.on("finish", async () => {
        if (ignoreDeductRoutes.includes(req.path)) {
            return;
        }
        // Only deduct credits for successful requests
        if (res.statusCode >= 200 && res.statusCode < 400) {
            // if req.creditsUsed not set, set it to 1.
            req.creditsUsed = req.creditsUsed || 1;
            log.info(`Deducting credits for user ${userUuid} with credits used: ${req.creditsUsed}`);
            try {
                const db = await getDB();

                // Use a transaction to ensure atomicity
                await db.transaction(async (tx: NodePgDatabase) => {
                    // Get the current credits with a lock
                    const [user] = await tx
                        .select({ credits: schemas.apiKey.credits })
                        .from(schemas.apiKey)
                        .where(eq(schemas.apiKey.uuid, userUuid))
                        .for('update'); // This locks the row for update

                    if (!user || user.credits <= 0) {
                        throw new Error('Insufficient credits');
                    }

                    // Update credits atomically
                    await tx
                        .update(schemas.apiKey)
                        .set({ credits: user.credits - req.creditsUsed! })
                        .where(
                            and(
                                eq(schemas.apiKey.uuid, userUuid),
                                gt(schemas.apiKey.credits, 0)
                            )
                        );

                    log.info(`Deducted 1 credit from user ${userUuid}. Remaining credits: ${user.credits - 1}`);
                });
            } catch (error) {
                log.error(`Failed to deduct credits for user ${userUuid}: ${error}`);
            }
        }
    });

    next();
}; 