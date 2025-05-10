import { randomUUID } from "node:crypto";
import { QueueManager } from "./managers/Queue.js";
import { KeyValueStore, sleep } from "crawlee";
import { Utils } from "./Utils.js";

async function main() {
    await QueueManager.getInstance().addJob("scrape", {
        url: "https://docs.bullmq.io/guide/returning-job-data",
        engine: "cheerio",
    });
    await QueueManager.getInstance().addJob("scrape", {
        url: "https://crawlee.dev/js/docs/introduction/refactoring",
        engine: "cheerio",
    });
    await QueueManager.getInstance().addJob("scrape", {
        url: "https://turbo.build/repo/docs/crafting-your-repository/creating-an-internal-package",
        engine: "cheerio",
    });
    await QueueManager.getInstance().addJob("scrape", {
        url: "https://docs.bullmq.io/guide/workers/sandboxed-processors",
        engine: "cheerio",
    });
    await QueueManager.getInstance().addJob("scrape", {
        url: "https://docs.bullmq.io/guide/workers/auto-removal-of-jobs",
        engine: "cheerio",
    });
    let jobid = await QueueManager.getInstance().addJob("scrape", {
        url: "https://www.producthunt.com/",
        engine: "cheerio",
    });
    console.log("Waiting for job to complete...");
    const data = await QueueManager.getInstance().waitJobDone("scrape", jobid);
    console.log(data);
    process.exit(0);
}

(async () => {
    try {
        await main();
    } catch (error) {
        console.error(error);
    }
})();
