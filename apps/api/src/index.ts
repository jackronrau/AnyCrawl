import express from "express";
import v1Router from "./routers/v1.js";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import responseTime from "response-time";
import { logMiddleware } from "./middlewares/LogMiddleware.js";
import { authMiddleware } from "./middlewares/AuthMiddleware.js";
import { checkCreditsMiddleware } from "./middlewares/CheckCreditsMiddleware.js";
import { deductCreditsMiddleware } from "./middlewares/DeductCreditsMiddleware.js";
import { log, ConsoleStream } from "@anycrawl/libs/log";

export const app = express();
const port = process.env.ANYCRAWL_API_PORT || 8080;

app.disable("x-powered-by");
app.use(cors());
app.use(
    morgan(process.env.NODE_ENV === "development" ? "dev" : "combined", {
        stream: new ConsoleStream(),
    })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(responseTime());
app.use(logMiddleware);

// Mount root router before auth middleware
app.get("/", (_req: express.Request, res: express.Response) => {
    res.send("Hello World");
});

// Health check endpoint
app.get("/health", (_req: express.Request, res: express.Response) => {
    res.status(200).json({ status: "ok" });
});

// check Auth
app.use(authMiddleware);
// check credits
app.use(checkCreditsMiddleware);
// deduct credits after successful requests
app.use(deductCreditsMiddleware);
// load routers
app.use("/v1", v1Router);

// Start the server
const server = app.listen(port, async () => {
    log.info(`✨ Server is running on port ${port}`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
    log.info(`🔄 Received ${signal}. Starting graceful shutdown...`);

    server.close((err) => {
        if (err) {
            log.error('❌ Error during server shutdown:', err);
            process.exit(1);
        }

        log.info('✅ Server closed gracefully');
        process.exit(0);
    });

    // Force shutdown if graceful shutdown takes too long
    setTimeout(() => {
        log.error('⚠️  Graceful shutdown timeout. Forcing exit...');
        process.exit(1);
    }, 10000); // 10 seconds timeout
};

// Handle process signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
    log.error('💥 Uncaught Exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    log.error(`💥 Unhandled Rejection at: ${promise} reason: ${reason}`);
    gracefulShutdown('UNHANDLED_REJECTION');
});

export { server };
