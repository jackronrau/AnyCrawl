export interface ExtractionOptions {
    includeTags?: string[];
    excludeTags?: string[];
}

/**
 * Non-main content tags and selectors to exclude from main content extraction
 * Based on common webpage structure patterns
 */
const EXCLUDE_NON_MAIN_TAGS: string[] = [
    "header",
    "footer",
    "nav",
    "aside",
    ".header",
    ".top",
    ".navbar",
    "#header",
    ".footer",
    ".bottom",
    "#footer",
    ".sidebar",
    ".side",
    ".aside",
    "#sidebar",
    ".modal",
    ".popup",
    "#modal",
    ".overlay",
    ".ad",
    ".ads",
    ".advert",
    "#ad",
    ".lang-selector",
    ".language",
    "#language-selector",
    ".social",
    ".social-media",
    ".social-links",
    "#social",
    ".menu",
    ".navigation",
    "#nav",
    ".breadcrumbs",
    "#breadcrumbs",
    ".share",
    "#share",
    ".widget",
    "#widget",
    ".cookie",
    "#cookie",
    "script",
    "style",
    "noscript"
];

/**
 * HTML Transformer for processing and cleaning HTML content
 * Handles HTML extraction, cleaning, and transformation operations
 */
export class HTMLTransformer {
    /**
     * Extract clean HTML content
     * Supports include_tags functionality and preserves original HTML structure
     */
    extractCleanHtml($: any, options?: ExtractionOptions): string {
        // Clone the cheerio instance to avoid modifying the original
        const $clone = $.load($.html());

        // If includeTags is specified, only extract those elements
        if (options?.includeTags && options.includeTags.length > 0) {
            // Create new document to collect matching elements
            const $newDocument = $.load("<div></div>");
            const $root = $newDocument('div');

            // For each include tag selector, find matching elements and add them
            for (const selector of options.includeTags) {
                const matchingElements = $clone(selector);
                matchingElements.each((_: number, element: any) => {
                    // Clone the element and append to root
                    const clonedElement = $clone(element).clone();
                    $root.append(clonedElement);
                });
            }

            return $root.html() || '';
        } else {
            // Standard extraction: preserve original structure, only remove unwanted elements

            // Remove non-main content elements using the constant
            $clone(EXCLUDE_NON_MAIN_TAGS.join(', ')).remove();

            // Apply excludeTags if specified
            if (options?.excludeTags && options.excludeTags.length > 0) {
                for (const selector of options.excludeTags) {
                    $clone(selector).remove();
                }
            }

            // Remove comments
            $clone('*').contents().filter(function (this: any) {
                return this.type === 'comment';
            }).remove();

            // Return the complete original HTML structure (preserves DOCTYPE, html, head, body, etc.)
            return $clone.html();
        }
    }

    /**
     * Extract specific elements based on CSS selectors
     * Similar to Firecrawl's include_tags functionality
     */
    extractElementsBySelectors($: any, selectors: string[]): string {
        const $clone = $.load($.html());
        const $newDocument = $.load("<div></div>");
        const $root = $newDocument('div');

        for (const selector of selectors) {
            const matchingElements = $clone(selector);
            matchingElements.each((_: number, element: any) => {
                const clonedElement = $clone(element).clone();
                $root.append(clonedElement);
            });
        }

        return $root.html() || '';
    }

    /**
     * Remove specific elements based on CSS selectors
     */
    removeElementsBySelectors($: any, selectors: string[]): any {
        const $clone = $.load($.html());

        for (const selector of selectors) {
            $clone(selector).remove();
        }

        return $clone;
    }

    /**
     * Clean HTML by removing unwanted elements and comments
     * Uses the EXCLUDE_NON_MAIN_TAGS constant for comprehensive cleaning
     */
    cleanHtml($: any): any {
        const $clone = $.load($.html());

        // Remove unwanted elements using the constant
        $clone(EXCLUDE_NON_MAIN_TAGS.join(', ')).remove();

        // Remove comments
        $clone('*').contents().filter(function (this: any) {
            return this.type === 'comment';
        }).remove();

        return $clone;
    }

    /**
     * Get the list of non-main content tags/selectors
     */
    static getNonMainTags(): string[] {
        return [...EXCLUDE_NON_MAIN_TAGS];
    }

    /**
     * Check if a selector is considered non-main content
     */
    static isNonMainTag(selector: string): boolean {
        return EXCLUDE_NON_MAIN_TAGS.includes(selector);
    }
}
