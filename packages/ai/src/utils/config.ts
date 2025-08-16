import { existsSync, readFileSync } from "fs";
import * as http from "http";
import * as https from "https";

let aiConfigCache: any | null = null;
let aiConfigFetchStarted = false;

const loadAIConfig = () => {
    const pathEnv = process.env.ANYCRAWL_AI_CONFIG_PATH;
    if (!pathEnv) return null;
    if (aiConfigCache) return aiConfigCache;
    const rawPath = pathEnv;
    // Support http(s) URL and local file path
    const isHttp = /^https?:\/\//i.test(rawPath);
    try {
        if (isHttp) {
            // Kick off async fetch similar to ANYCRAWL_PROXY_CONFIG loader; avoid duplicate fetches
            if (aiConfigFetchStarted) return aiConfigCache;
            aiConfigFetchStarted = true;
            const urlObj = new URL(rawPath);
            const lib = urlObj.protocol === 'https:' ? https : http;
            const req = lib.request(urlObj, (res) => {
                if (res.statusCode && res.statusCode >= 400) {
                    res.resume();
                    return;
                }
                let data = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        aiConfigCache = JSON.parse(data);
                    } catch {
                        // swallow parse errors
                    }
                });
            });
            req.on('error', () => { /* ignore network errors */ });
            req.end();
            return aiConfigCache;
        }
        // Local file path
        if (!existsSync(rawPath)) {
            throw new Error('ai-providers.config.json not found');
        }
        aiConfigCache = JSON.parse(readFileSync(rawPath, 'utf8'));
        return aiConfigCache;
    } catch (e) {
        throw e instanceof Error ? e : new Error('Failed to load AI config');
    }
}

export { loadAIConfig };