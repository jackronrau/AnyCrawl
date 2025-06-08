import 'zod-openapi/extend';
import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Import real schemas from API workspace packages
import { scrapeSchema } from 'api/src/types/ScrapeSchema.js';
import { searchSchema } from 'api/src/types/SearchSchema.js';
import { baseSchema } from 'api/src/types/BaseSchema.js';

// Use zod-openapi to extend existing schemas with OpenAPI metadata
const scrapeSchemaWithOpenAPI = scrapeSchema.openapi({
    description: 'Request schema for web scraping'
});

const searchSchemaWithOpenAPI = searchSchema.openapi({
    description: 'Request schema for web search'
});

// Extend search schema with OpenAPI descriptions
const searchSchemaExtended = searchSchema.extend({
    engine: searchSchema.shape.engine?.openapi({
        description: 'The search engine to be used',
        example: 'google'
    }) || z.string().optional(),
    query: z.string().openapi({
        description: 'The search query string',
        example: 'OpenAI ChatGPT'
    }),
    limit: searchSchema.shape.limit?.openapi({
        description: 'Maximum number of results per page',
        example: 10,
        default: 10
    }) || z.number().optional(),
    offset: searchSchema.shape.offset?.openapi({
        description: 'Number of results to skip',
        example: 0,
        default: 0
    }) || z.number().optional(),
    pages: searchSchema.shape.pages?.openapi({
        description: 'Number of pages to search',
        example: 1,
        default: 1
    }) || z.number().optional(),
    lang: searchSchema.shape.lang?.openapi({
        description: 'Language locale for search results',
        example: 'en'
    }) || z.string().optional(),
    country: searchSchema.shape.country?.openapi({
        description: 'Country locale for search results',
        example: 'US'
    }) || z.string().optional(),
    safeSearch: searchSchema.shape.safeSearch?.openapi({
        description: 'Safe search filter level for Google search engine. 0: off, 1: medium, 2: high, null: default. Only applicable to Google engine.',
        example: 1,
        enum: [0, 1, 2],
        nullable: true
    }) || z.number().nullable().optional()
}).openapi({
    description: 'Request schema for web search'
});

// Success Response Schemas
const scrapeSuccessResponseSchema = z.object({
    success: z.literal(true).openapi({
        description: 'Indicates the scraping request was successful'
    }),
    data: z.union([
        z.object({
            url: z.string().url().openapi({
                description: 'The URL that was scraped',
                example: 'https://httpstat.us/200'
            }),
            status: z.literal('completed').openapi({
                description: 'The status of the scraping job when successful',
                example: 'completed'
            }),
            jobId: z.string().uuid().openapi({
                description: 'Unique identifier for the scraping job',
                example: '7a2e165d-8f81-4be6-9ef7-23222330a396'
            }),
            title: z.string().openapi({
                description: 'The title of the scraped page',
                example: ''
            }),
            html: z.string().openapi({
                description: 'The HTML content of the scraped page',
                example: '200 OK'
            }),
            markdown: z.string().openapi({
                description: 'The markdown content of the scraped page',
                example: '200 OK'
            }),
            metadata: z.array(z.any()).openapi({
                description: 'Additional metadata extracted from the page',
                example: []
            }),
            timestamp: z.string().datetime().openapi({
                description: 'Timestamp when the scraping was completed',
                example: '2025-05-25T07:56:44.162Z'
            })
        }).openapi({
            description: 'Successful scraping result data'
        }),
        z.object({
            url: z.string().url().openapi({
                description: 'The URL that was attempted to be scraped',
                example: 'https://httpstat.us/403'
            }),
            status: z.literal('failed').openapi({
                description: 'The status of the scraping job when failed',
                example: 'failed'
            }),
            error: z.string().openapi({
                description: 'Error message describing why the scraping failed',
                example: 'Request blocked - received 403 status code.'
            })
        }).openapi({
            description: 'Failed scraping result data'
        })
    ]).openapi({
        description: 'Scraping result data - either successful with full content or failed with error message'
    })
}).openapi({
    description: 'Scraping response format (HTTP 200) - can contain either successful or failed scraping results'
});

const searchSuccessResponseSchema = z.object({
    success: z.literal(true).openapi({
        description: 'Indicates the search request was successful'
    }),
    data: z.array(z.union([
        z.object({
            title: z.string().openapi({
                description: 'The title of the search result',
                example: 'AlsoAsked: People Also Ask keyword research tool'
            }),
            url: z.string().url().openapi({
                description: 'The URL of the search result',
                example: 'https://alsoasked.com/'
            }),
            description: z.string().openapi({
                description: 'The description/snippet of the search result',
                example: 'Find the questions people also ask. Enter a question, brand or search query. e.g. \'keyword research\'.'
            }),
            source: z.string().openapi({
                description: 'The source of the search result',
                example: 'Google Search Result'
            })
        }).openapi({
            description: 'Search result with URL and description'
        }),
        z.object({
            title: z.string().openapi({
                description: 'The title of the search suggestion',
                example: 'Keyword tool'
            }),
            source: z.string().openapi({
                description: 'The source of the search suggestion',
                example: 'Google Suggestions'
            })
        }).openapi({
            description: 'Search suggestion without URL'
        })
    ])).openapi({
        description: 'Array of search results and suggestions - can be empty if no results found',
        example: [
            {
                "title": "The Investment Case for Digital Infrastructure",
                "url": "https://www.patrizia.ag/fileadmin/user_upload/The_Investment_Case_for_Digital_Infrastructure.pdf",
                "description": "It took just five days for ChatGPT to reach one million users and just two months to reach 100 million users, the fastest of any social media platform or app in ...48 pages",
                "source": "Google Search Result"
            }
        ]
    })
}).openapi({
    description: 'Successful search response format containing an array of search results and suggestions (may be empty)'
});

const errorResponseSchema = z.object({
    success: z.literal(false).openapi({
        description: 'Indicates the request failed'
    }),
    error: z.string().openapi({
        description: 'Error message',
        example: 'Validation error'
    }),
    details: z.object({
        issues: z.array(z.object({
            field: z.string().openapi({
                description: 'The field that caused the error',
                example: 'engine'
            }),
            message: z.string().openapi({
                description: 'Error message for the field',
                example: "Invalid enum value. Expected 'playwright' | 'cheerio' | 'puppeteer', received 'cheeri1o'"
            }),
            code: z.string().openapi({
                description: 'Error code',
                example: 'invalid_enum_value'
            })
        })).openapi({
            description: 'Array of validation issues'
        }),
        messages: z.array(z.string()).openapi({
            description: 'Array of validation error messages',
            example: ["Invalid enum value. Expected 'playwright' | 'cheerio' | 'puppeteer', received 'cheeri1o'"]
        })
    }).openapi({
        description: 'Validation error details'
    })
}).openapi({
    description: 'Standard error response format for validation errors'
});

const InsufficientCreditsResponseSchema = z.object({
    success: z.literal(false).openapi({
        description: 'Indicates the request failed due to insufficient credits'
    }),
    error: z.string().openapi({
        description: 'Error message',
        example: 'Insufficient credits'
    }),
    current_credits: z.number().openapi({
        description: 'Current credit balance of the user',
        example: -2
    })
}).openapi({
    description: 'Payment required response format with credit information'
});

const unauthorizedResponseSchema = z.object({
    success: z.literal(false).openapi({
        description: 'Indicates the request failed due to authentication issues'
    }),
    error: z.string().openapi({
        description: 'Authentication error message',
        example: 'Invalid API key',
        examples: ['Invalid API key', 'No authorization header provided']
    })
}).openapi({
    description: 'Unauthorized response format for authentication errors'
});

const internalServerErrorResponseSchema = z.object({
    success: z.literal(false).openapi({
        description: 'Indicates the request failed due to server error'
    }),
    error: z.string().openapi({
        description: 'Server error message',
        example: 'Internal server error'
    }),
    message: z.string().openapi({
        description: 'Detailed error message describing what went wrong',
        example: 'Job 0ae56ed9-d9a9-4998-aea9-2ff5b51b2e4e timed out after 30000 seconds'
    })
}).openapi({
    description: 'Internal server error response format'
});

// Generate OpenAPI document
const document = createDocument({
    openapi: '3.1.0',
    info: {
        title: 'AnyCrawl API',
        version: '0.0.1',
        description: 'AnyCrawl 🚀: A Node.js/TypeScript crawler that turns websites into LLM-ready data and extracts structured SERP results from Google/Bing/Baidu/etc. Native multi-threading for bulk processing.',
        contact: {
            name: 'AnyCrawl Support',
            url: 'https://github.com/anycrawl/anycrawl',
            email: 'support@anycrawl.dev'
        },
        license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
        },
        termsOfService: 'https://anycrawl.dev/terms'
    },
    servers: [
        {
            url: 'https://api.anycrawl.dev',
            description: 'Production server'
        },
        {
            url: 'http://localhost:8080',
            description: 'Development server (localhost)'
        }
    ],
    paths: {
        '/': {
            get: {
                summary: 'Home',
                description: 'Home',
                tags: ['Health'],
                responses: {
                    '200': {
                        description: 'Server is running',
                        content: {
                            'text/plain': {
                                schema: {
                                    type: 'string',
                                    example: 'Hello World'
                                }
                            }
                        }
                    }
                }
            }
        },
        '/health': {
            get: {
                summary: 'Health status',
                description: 'Get server health status',
                tags: ['Health'],
                responses: {
                    '200': {
                        description: 'Server health status',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: {
                                            type: 'string',
                                            example: 'ok'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/v1/scrape': {
            post: {
                summary: 'Scrape',
                description: 'AnyCrawl scrapes a URL, turns it into structured data and LLM-ready data. It supports multiple engines, including Cheerio, Playwright, Puppeteer, and more. It also supports multiple output formats, including HTML, Markdown, JSON, and more.',
                tags: ['Scraping'],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: scrapeSchemaWithOpenAPI
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Scraping successful',
                        content: {
                            'application/json': {
                                schema: scrapeSuccessResponseSchema
                            }
                        }
                    },
                    '400': {
                        description: 'Bad request - validation error',
                        content: {
                            'application/json': {
                                schema: errorResponseSchema
                            }
                        }
                    },
                    '401': {
                        description: 'Unauthorized - missing or invalid authentication',
                        content: {
                            'application/json': {
                                schema: unauthorizedResponseSchema
                            }
                        }
                    },
                    '402': {
                        description: 'Payment required - subscription or credits needed',
                        content: {
                            'application/json': {
                                schema: InsufficientCreditsResponseSchema
                            }
                        }
                    },
                    '500': {
                        description: 'Internal server error',
                        content: {
                            'application/json': {
                                schema: internalServerErrorResponseSchema
                            }
                        }
                    }
                }
            }
        },
        '/v1/search': {
            post: {
                summary: 'SERP',
                description: 'Search the web using specified search engine',
                tags: ['Search'],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: searchSchemaExtended
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Search successful',
                        content: {
                            'application/json': {
                                schema: searchSuccessResponseSchema
                            }
                        }
                    },
                    '400': {
                        description: 'Bad request - validation error',
                        content: {
                            'application/json': {
                                schema: errorResponseSchema
                            }
                        }
                    },
                    '401': {
                        description: 'Unauthorized - missing or invalid authentication',
                        content: {
                            'application/json': {
                                schema: unauthorizedResponseSchema
                            }
                        }
                    },
                    '402': {
                        description: 'Payment required - subscription or credits needed',
                        content: {
                            'application/json': {
                                schema: InsufficientCreditsResponseSchema
                            }
                        }
                    },
                    '500': {
                        description: 'Internal server error',
                        content: {
                            'application/json': {
                                schema: internalServerErrorResponseSchema
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT token for API authentication'
            }
        }
    },
    tags: [
        {
            name: 'Health',
            description: 'Health check endpoints'
        },
        {
            name: 'Scraping',
            description: 'Turn a URL into structured data and LLM-ready data'
        },
        {
            name: 'Search',
            description: 'SERP, search engine results page'
        }
    ]
});

// Write generated OpenAPI document to file
const outputPath = join(process.cwd(), 'openapi.json');

try {
    writeFileSync(outputPath, JSON.stringify(document, null, 2));

    console.log('🎉 OpenAPI specification generated successfully!');
    console.log(`📁 File location: ${outputPath}`);
    console.log(`📖 API: ${document.info.title} v${document.info.version}`);
    console.log(`🛣️  Endpoints: ${Object.keys(document.paths || {}).length}`);
    console.log(`📋 Schemas: ${Object.keys(document.components?.schemas || {}).length}`);
    console.log(`🔄 Response Types: ${Object.keys(document.components?.responses || {}).length}`);
    console.log(`🏷️  Tags: ${document.tags?.length || 0}`);

    // Validate document structure
    const pathCount = Object.keys(document.paths || {}).length;
    const schemaCount = Object.keys(document.components?.schemas || {}).length;
    const responseCount = Object.keys(document.components?.responses || {}).length;

    if (pathCount === 0) {
        console.warn('⚠️  Warning: No paths defined in the document');
    }

    if (schemaCount === 0) {
        console.warn('⚠️  Warning: No schemas defined in the document');
    }

    console.log('✨ Document generation completed without errors');

} catch (error) {
    console.error('❌ Error writing OpenAPI specification:');
    console.error(error);
    process.exit(1);
} 