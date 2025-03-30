import { randomUUID } from "node:crypto";
import { QueueManager } from "./queue/index.js";

await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://crawlee.dev'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://docs.bullmq.io/guide/returning-job-data'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://crawlee.dev/js/docs/guides/configuration'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://crawlee.dev/js/docs/introduction/refactoring'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://turbo.build/repo/docs/crafting-your-repository/creating-an-internal-package'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://docs.bullmq.io/guide/workers/sandboxed-processors'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://docs.bullmq.io/guide/workers/auto-removal-of-jobs'
});
await QueueManager.getInstance().addJob('scrape', 'scrape', randomUUID(), {
    url: 'https://www.baidu.com'
});
process.exit(0);