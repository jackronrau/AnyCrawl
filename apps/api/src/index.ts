import express from "express";
import { eq } from "drizzle-orm";
import { getDB, schemas } from "./db";
import { logMiddleware } from "./middlewares/LogMiddleware";
const app = express();
const port = process.env.API_PORT || 8080;

// load middleware
app.use(logMiddleware);

// Start the server
app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
});