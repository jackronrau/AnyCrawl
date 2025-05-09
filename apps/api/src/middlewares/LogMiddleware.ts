import { Request, Response, NextFunction } from 'express';
import { requestLog } from '../db/schemas/PostgreSQL';
import { getDB } from '../db';
import { log } from '@repo/libs/log';

export const logMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime();
    const originalSend = res.send;

    // Override res.send to capture response data
    res.send = function (body: any) {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const processingTimeMs = Math.floor((seconds * 1000000) + (nanoseconds / 1000)); // Convert to microseconds and round down to integer

        // Get API key from request header
        const apiKeyId = req.headers['x-api-key'] as string;
        // Create complete request payload
        const requestPayload = {
            body: req.body,
            query: req.query,
            params: req.params,
        };

        // Create log entry
        const logEntry = {
            apiKey: apiKeyId || null,
            path: req.path,
            method: req.method,
            statusCode: res.statusCode,
            processingTimeMs: processingTimeMs,
            creditsUsed: 0,
            ipAddress: req.ip || null,
            userAgent: req.headers['user-agent'] || null,
            requestPayload: JSON.stringify(requestPayload),
            requestHeader: req.headers ? JSON.stringify(req.headers) : null,
            success: res.statusCode >= 200 && res.statusCode < 400 ? 1 : 0,
            createdAt: new Date(),
        };

        // Insert log entry asynchronously
        getDB()
            .then(db => db.insert(requestLog).values(logEntry))
            .catch((error: Error) => {
                log.error(`Failed to log request: ${error}`);
            });

        // Call original send
        return originalSend.call(this, body);
    };

    next();
};
