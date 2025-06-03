import { AD_DOMAINS } from "@anycrawl/libs";

export enum ConfigurableEngineType {
    CHEERIO = 'cheerio',
    PLAYWRIGHT = 'playwright',
    PUPPETEER = 'puppeteer'
}

/**
 * Engine configurator for applying engine-specific settings
 * Separates configuration logic from the main engine
 */
export class EngineConfigurator {
    /**
     * Apply engine-specific configurations
     */
    static configure(crawlerOptions: any, engineType: ConfigurableEngineType): any {
        const options = { ...crawlerOptions };

        // Apply common autoscaled pool options
        if (!options.autoscaledPoolOptions) {
            options.autoscaledPoolOptions = {
                isFinishedFunction: async () => false,
            };
        }

        // Apply browser-specific configurations
        if (this.isBrowserEngine(engineType)) {
            this.configureBrowserEngine(options);
        }

        // Apply engine-specific configurations
        switch (engineType) {
            case ConfigurableEngineType.PUPPETEER:
                this.configurePuppeteer(options);
                break;
            case ConfigurableEngineType.PLAYWRIGHT:
                this.configurePlaywright(options);
                break;
            case ConfigurableEngineType.CHEERIO:
                this.configureCheerio(options);
                break;
        }

        return options;
    }

    private static isBrowserEngine(engineType: ConfigurableEngineType): boolean {
        return engineType === ConfigurableEngineType.PLAYWRIGHT ||
            engineType === ConfigurableEngineType.PUPPETEER;
    }

    private static configureBrowserEngine(options: any): void {
        // Ad blocking configuration
        const adBlockingHook = async ({ blockRequests }: any) => {
            await blockRequests({
                extraUrlPatterns: AD_DOMAINS,
            });
        };

        // Merge with existing preNavigationHooks
        const existingHooks = options.preNavigationHooks || [];
        options.preNavigationHooks = [adBlockingHook, ...existingHooks];

        // Apply headless configuration from environment
        if (options.headless === undefined) {
            options.headless = process.env.ANYCRAWL_HEADLESS !== "false";
        }
    }

    private static configurePuppeteer(options: any): void {
        // Puppeteer-specific configurations can be added here
        // For example: browserPoolOptions, specific launch options, etc.
    }

    private static configurePlaywright(options: any): void {
        // Playwright-specific configurations can be added here
        // For example: browser type, context options, etc.
    }

    private static configureCheerio(options: any): void {
        // Cheerio-specific configurations can be added here
        // For example: parsing options, etc.
    }
} 