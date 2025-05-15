import { Request, Response, NextFunction } from "express";
import { requestLog } from "../db/schemas/PostgreSQL.js";
import { getDB } from "../db/index.js";
import { log } from "@anycrawl/libs/log";

export const logMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Skip logging for health check endpoint
    if (req.path === '/health') {
        return next();
    }

    let responseBody: any;
    const originalSend = res.send;
    res.send = function (body?: any): Response {
        responseBody = body;
        return originalSend.call(this, body);
    };

    res.on("finish", () => {
        // Get API key from request header
        const apiKeyId = req.headers["x-api-key"] as string;
        // Create complete request payload
        const requestPayload = {
            body: req.body,
            query: req.query,
            params: req.params,
        };
        const responseHeaders = res.getHeaders();
        // Filter out any null prototype objects from response headers
        const filteredHeaders = Object.fromEntries(
            Object.entries(responseHeaders).filter(([_, value]) => value != null)
        );
        // Check if responseBody is a valid JSON string
        let parsedResponseBody;
        try {
            parsedResponseBody = JSON.parse(responseBody);
        } catch (e) {
            // If parsing fails, use the original response body
            parsedResponseBody = responseBody;
        }
        const logEntry = {
            apiKey: apiKeyId || null,
            path: req.path,
            method: req.method,
            statusCode: res.statusCode,
            processingTimeMs: res.getHeader("x-response-time") ? String(res.getHeader("x-response-time")).replace("ms", "") : null,
            creditsUsed: 0,
            ipAddress: req.ip || null,
            userAgent: req.headers["user-agent"] || null,
            requestPayload: requestPayload,
            requestHeader: req.headers,
            responseBody: parsedResponseBody,
            responseHeader: filteredHeaders,
            success: res.statusCode >= 200 && res.statusCode < 400 ? 1 : 0,
            createdAt: new Date(),
        };

        // Insert log entry asynchronously
        getDB()
            .then((db) => db.insert(requestLog).values(logEntry))
            .catch((error: Error) => {
                log.error(`Failed to log request: ${error}, ${JSON.stringify(logEntry)}`);
            });
    });

    next();
};
