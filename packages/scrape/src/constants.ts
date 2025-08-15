// Lightweight constants shared by API/docs. No heavy imports here.

export const ALLOWED_ENGINES = ["playwright", "cheerio", "puppeteer"] as const;

export const SCRAPE_FORMATS = [
    "markdown",
    "html",
    "text",
    "screenshot",
    "screenshot@fullPage",
    "rawHtml",
    "json",
] as const;


