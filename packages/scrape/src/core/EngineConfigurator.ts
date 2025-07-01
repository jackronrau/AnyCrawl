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

        // Handle authentication to allow accessing 401 pages
        const authenticationHook = async ({ page }: any) => {
            if (engineType === ConfigurableEngineType.PUPPETEER) {
                try {
                    // First, set authenticate to null
                    await page.authenticate(null);

                    // Then use CDP to handle auth challenges
                    const client = await page.target().createCDPSession();

                    // Enable Fetch domain to intercept auth challenges
                    await client.send('Fetch.enable', {
                        handleAuthRequests: true,
                        patterns: [{ urlPattern: '*' }]
                    });

                    // Listen for auth required events
                    client.on('Fetch.authRequired', async (event: any) => {
                        log.debug(`Auth challenge intercepted for: ${event.request.url}`);

                        // Continue without auth to see 401 page content
                        try {
                            await client.send('Fetch.continueWithAuth', {
                                requestId: event.requestId,
                                authChallengeResponse: {
                                    response: 'CancelAuth'
                                }
                            });
                        } catch (err) {
                            log.debug(`Failed to cancel auth: ${err}`);
                            // Try to continue the request anyway
                            try {
                                await client.send('Fetch.continueRequest', {
                                    requestId: event.requestId
                                });
                            } catch (e) {
                                log.debug(`Failed to continue request: ${e}`);
                            }
                        }
                    });

                    // Also handle request paused events
                    client.on('Fetch.requestPaused', async (event: any) => {
                        // Continue all paused requests
                        try {
                            await client.send('Fetch.continueRequest', {
                                requestId: event.requestId
                            });
                        } catch (e) {
                            log.debug(`Failed to continue paused request: ${e}`);
                        }
                    });

                    log.debug('CDP auth handling enabled for Puppeteer');
                } catch (e) {
                    log.debug(`Failed to set up auth handling: ${e}`);
                }
            } else if (engineType === ConfigurableEngineType.PLAYWRIGHT) {
                // For Playwright, we might need different handling
                // Currently Playwright handles this better by default
            }
        };

        // Merge with existing preNavigationHooks
        const existingHooks = options.preNavigationHooks || [];
        options.preNavigationHooks = [adBlockingHook, requestTimeoutHook, authenticationHook, ...existingHooks];

        // Apply headless configuration from environment
        if (options.headless === undefined) {
            options.headless = process.env.ANYCRAWL_HEADLESS !== "false";
        }

        // Configure retry behavior - disable automatic retries for blocked pages
        options.retryOnBlocked = true;

        options.maxRequestRetries = 3;
        options.maxSessionRotations = 3; // Enable session rotation

        // Configure session pool with specific settings
        if (options.useSessionPool !== false) {
            options.sessionPoolOptions = {
                ...options.sessionPoolOptions,
                // Specify which status codes should NOT trigger session rotation
                // This allows us to capture these status codes while still rotating for other errors
                blockedStatusCodes: [], // Only these codes will trigger rotation
            };


        }
        // Configure how errors are evaluated
        options.errorHandler = async (context: any, error: Error) => {
            log.debug(`Error handler triggered: ${error.message}`);

            // Check error type and determine retry strategy
            const errorMessage = error.message || '';

            // Proxy-related errors that might be temporary
            const temporaryProxyErrors = [
                'ERR_PROXY_CONNECTION_FAILED',
                'ERR_TUNNEL_CONNECTION_FAILED',
                'ERR_PROXY_AUTH_FAILED',
                'ERR_SOCKS_CONNECTION_FAILED'
            ];

            if (temporaryProxyErrors.some(err => errorMessage.includes(err))) {
                log.debug('Temporary proxy error detected, allowing retry with session rotation');
                return true; // Retry with new session
            }

            // For all other errors, don't retry
            log.debug('Unknown error type, not retrying');
            return false;
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