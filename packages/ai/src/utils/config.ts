import { existsSync, readFileSync } from "fs";

const loadAIConfig = () => {
    if (process.env.ANYCRAWL_AI_CONFIG_PATH) {
        if (!existsSync(process.env.ANYCRAWL_AI_CONFIG_PATH)) {
            throw new Error('ai-providers.config.json not found');
        }
        const config = JSON.parse(readFileSync(process.env.ANYCRAWL_AI_CONFIG_PATH, 'utf8'));
        return config;
    }
    return null;
}

export { loadAIConfig };