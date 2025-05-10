import express from "express";
import v1Router from "./routers/v1.js";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import responseTime from "response-time";
import { logMiddleware } from "./middlewares/LogMiddleware.js";
import { authMiddleware } from "./middlewares/AuthMiddleware.js";
import { checkCreditsMiddleware } from "./middlewares/CheckCreditsMiddleware.js";
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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(responseTime());
app.use(logMiddleware);

// Mount root router before auth middleware
app.get("/", (_req: express.Request, res: express.Response) => {
    res.send("Hello World");
});

// check Auth
app.use(authMiddleware);
// check credits
app.use(checkCreditsMiddleware);
// load routers
app.use("/v1", v1Router);

// Start the server
const server = app.listen(port, async () => {
    log.info(`✨ Server is running on port ${port}`);
});

export { server };
