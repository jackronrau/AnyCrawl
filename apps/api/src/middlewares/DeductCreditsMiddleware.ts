import { Response, NextFunction } from "express";
import { getDB, schemas, eq, sql } from "@anycrawl/db";
import { RequestWithAuth } from "../types/Types.js";
import { log } from "@anycrawl/libs/log";

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
    res.on("finish", () => {
        if (ignoreDeductRoutes.includes(req.path)) {
            return;
        }
        // Only deduct credits for successful requests
        if (res.statusCode >= 200 && res.statusCode < 400) {
            // if req.creditsUsed not set, set it to 1. Preserve explicit 0.
            req.creditsUsed = req.creditsUsed ?? 1;
            log.info(`Deducting credits for user ${userUuid} with credits used: ${req.creditsUsed}`);
            if (req.creditsUsed == 0) {
                return;
            }

            // Fire and forget - don't block response completion
            deductCreditsAsync(userUuid, req.creditsUsed, req.auth, req.jobId).catch(error => {
                log.error(`Failed to deduct credits for user ${userUuid}, credits used: ${req.creditsUsed}, error: ${error}`);
            });
        }
    });

    next();
};

/**
 * Asynchronously deduct credits without blocking the response
 * This function runs in the background and doesn't affect response time
 */
async function deductCreditsAsync(
    userUuid: string | undefined,
    creditsUsed: number,
    auth: any,
    jobId?: string
): Promise<void> {
    if (!userUuid) {
        log.warning('Cannot deduct credits: user UUID not found');
        return;
    }

    try {
        const db = await getDB();

        // Use transaction to ensure atomicity of credits deduction and job update
        await db.transaction(async (tx: any) => {
            // Update credits and last_used_at atomically in a single query, allowing negative credits
            const [updatedUser] = await tx
                .update(schemas.apiKey)
                .set({
                    credits: sql`${schemas.apiKey.credits} - ${creditsUsed}`,
                    lastUsedAt: new Date()
                })
                .where(eq(schemas.apiKey.uuid, userUuid))
                .returning({ credits: schemas.apiKey.credits });

            if (!updatedUser) {
                throw new Error('User not found');
            }

            // Update the auth object with the new credit balance
            if (auth) {
                auth.credits = updatedUser.credits;
            }

            // If this request is associated with a job, update jobs.credits_used accordingly
            if (jobId) {
                await tx.update(schemas.jobs).set({
                    creditsUsed: sql`${schemas.jobs.creditsUsed} + ${creditsUsed}`,
                    updatedAt: new Date(),
                }).where(eq(schemas.jobs.jobId, jobId));
            }
        });

        log.info(`Deducted ${creditsUsed} credits from user ${userUuid}. Remaining credits: ${auth?.credits}`);
    } catch (error) {
        log.error(`Failed to deduct credits for user ${userUuid}: ${error}`);
        throw error; // Re-throw to be caught by the caller
    }
} 