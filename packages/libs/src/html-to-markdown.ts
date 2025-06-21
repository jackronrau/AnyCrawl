import TurndownService from "turndown";

export function htmlToMarkdown(html: string): string {
    // Pre-process HTML to clean up whitespace
    html = html
        .replace(/>\s+</g, '><')  // Remove whitespace between tags
        .replace(/\s+/g, ' ')      // Normalize all whitespace to single spaces
        .trim();

    const turndownService = new TurndownService({
        preformattedCode: false,
    });

    // Remove unnecessary elements that create noise
    turndownService.remove([
        "script",
        "style",
        "noscript",
        "meta",
        "link"
    ]);

    // Override the default paragraph rule to reduce spacing
    turndownService.addRule('paragraphs', {
        filter: 'p',
        replacement: function (content: string) {
            return '\n\n' + content.trim() + '\n\n';
        }
    });

    // Custom rule to handle divs - treat them as inline unless they have block content
    turndownService.addRule('divs', {
        filter: 'div',
        replacement: function (content: string, node: Node) {
            const trimmedContent = content.trim();
            if (!trimmedContent) return '';

            // Check if div contains block elements
            const element = node as HTMLElement;
            const hasBlockElements = element.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre');

            if (hasBlockElements) {
                return '\n\n' + trimmedContent + '\n\n';
            } else {
                // Treat as inline, add space if needed
                return trimmedContent + ' ';
            }
        }
    });

    // Custom rule to handle spans and ensure proper spacing
    turndownService.addRule('spans', {
        filter: 'span',
        replacement: function (content: string, node: Node) {
            const trimmedContent = content.trim();
            if (!trimmedContent) return '';

            // Check if we need to add space after this span
            const nextSibling = node.nextSibling;
            const prevSibling = node.previousSibling;

            // Add space before if previous sibling was text or another span with content
            let prefix = '';
            if (prevSibling &&
                ((prevSibling.nodeType === 3 && prevSibling.textContent && prevSibling.textContent.trim()) ||
                    (prevSibling.nodeName === 'SPAN' && prevSibling.textContent && prevSibling.textContent.trim()))) {
                prefix = ' ';
            }

            // Add space after if next sibling exists and has content
            let suffix = '';
            if (nextSibling &&
                ((nextSibling.nodeType === 3 && nextSibling.textContent && nextSibling.textContent.trim()) ||
                    (nextSibling.nodeName === 'SPAN' && nextSibling.textContent && nextSibling.textContent.trim()))) {
                suffix = ' ';
            }

            return prefix + trimmedContent + suffix;
        }
    });

    // Handle emphasis elements
    turndownService.addRule('emphasis', {
        filter: ['em', 'i', 'strong', 'b'],
        replacement: function (content: string, node: Node) {
            const cleanContent = content.trim();
            if (!cleanContent) return '';

            const nodeName = node.nodeName.toLowerCase();
            if (nodeName === 'em' || nodeName === 'i') {
                return '*' + cleanContent + '*';
            } else if (nodeName === 'strong' || nodeName === 'b') {
                return '**' + cleanContent + '**';
            }

            return cleanContent;
        }
    });

    // Custom rule for line breaks
    turndownService.addRule('lineBreaks', {
        filter: 'br',
        replacement: function () {
            return '\n';
        }
    });

    // Convert and clean up the result
    let markdown = turndownService.turndown(html);

    // Aggressive post-processing
    markdown = markdown.trim();

    return markdown;
}
