import { randomUUID } from "node:crypto";
import { QueueManager } from "./queue/index.js";


await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://docs.bullmq.io/guide/returning-job-data',
    engine: 'cheerio'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://crawlee.dev/js/docs/introduction/refactoring',
    engine: 'cheerio'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://turbo.build/repo/docs/crafting-your-repository/creating-an-internal-package',
    engine: 'cheerio'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://docs.bullmq.io/guide/workers/sandboxed-processors',
    engine: 'cheerio'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://docs.bullmq.io/guide/workers/auto-removal-of-jobs',
    engine: 'cheerio'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://www.producthunt.com/',
    engine: 'cheerio'
});
process.exit(0);