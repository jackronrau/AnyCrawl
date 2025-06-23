import { AD_DOMAINS, log } from "@anycrawl/libs";
import { BrowserName } from "crawlee";
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
            this.configureBrowserEngine(options, engineType);
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

    private static configureBrowserEngine(options: any, engineType: ConfigurableEngineType): void {
        // Ad blocking configuration
        const adBlockingHook = async ({ page }: any) => {
            const shouldBlock = (url: string) => AD_DOMAINS.some(domain => url.includes(domain));

            if (engineType === ConfigurableEngineType.PLAYWRIGHT) {
                await page.route('**/*', (route: any) => {
                    const url = route.request().url();
                    if (shouldBlock(url)) {
                        log.info(`Aborting request to ${url}`);
                        return route.abort();
                    }
                    return route.continue();
                });
            } else if (engineType === ConfigurableEngineType.PUPPETEER) {
                await page.setRequestInterception(true);
                page.on('request', (req: any) => {
                    const url = req.url();
                    if (shouldBlock(url)) {
                        log.info(`Aborting request to ${url}`);
                        req.abort();
                    } else {
                        req.continue();
                    }
                });
            }
        };

        // set request timeout for each request
        const requestTimeoutHook = async ({ request }: any, gotoOptions: any) => {
            log.debug(`Setting request timeout for ${request.url} to ${request.userData.options.timeout || 30_000}`);
            gotoOptions.timeout = request.userData.options.timeout || 30_000;
        };

        // Merge with existing preNavigationHooks
        const existingHooks = options.preNavigationHooks || [];
        options.preNavigationHooks = [adBlockingHook, requestTimeoutHook, ...existingHooks];

        // Apply headless configuration from environment
        if (options.headless === undefined) {
            options.headless = process.env.ANYCRAWL_HEADLESS !== "false";
        }
        // try to bypass any detected bot protection
        options.retryOnBlocked = true;

        options.maxRequestRetries = 3;
        options.maxSessionRotations = 3;

        // Configure session pool with empty blocked status codes since we handle them manually
        options.sessionPoolOptions = {
            ...options.sessionPoolOptions,
            blockedStatusCodes: [401, 403, 429],
        };
    }

    private static configurePuppeteer(options: any): void {
        // Puppeteer-specific configurations can be added here
        options.browserPoolOptions = {
            useFingerprints: true,
            fingerprintOptions: {
                fingerprintGeneratorOptions: {
                    browsers: [{ name: BrowserName.chrome, minVersion: 120 }],
                },
            },
        };
    }

    private static configurePlaywright(options: any): void {
        // Playwright-specific configurations can be added here
        options.browserPoolOptions = {
            useFingerprints: true,
            fingerprintOptions: {
                fingerprintGeneratorOptions: {
                    browsers: [{ name: BrowserName.chrome, minVersion: 120 }],
                },
            },
        };
    }

    private static configureCheerio(options: any): void {
        // Cheerio-specific configurations can be added here
    }
} 