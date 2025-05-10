import TurndownService from "turndown";

export function htmlToMarkdown(html: string): string {
    const turndownService = new TurndownService({
        preformattedCode: false,
    });
    // rules here
    turndownService.remove("script");
    return turndownService.turndown(html);
}
