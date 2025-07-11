import { generateObject, JSONSchema7, jsonSchema, streamObject, NoObjectGeneratedError } from "ai";
import { BaseAgent } from "./BaseAgent.js";
import { TextChunker, ChunkResult } from "./TextChunker.js";
import { log } from "@anycrawl/libs";
import { buildExtractionPrompt, EXTRACT_SYSTEM_PROMPT } from "../prompts/extract.prompts.js";

// --- Schema normalization helpers ---
function removeDefaultProperty(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(removeDefaultProperty);
    } else if (obj && typeof obj === "object") {
        const { default: _default, ...rest } = obj;
        return Object.fromEntries(
            Object.entries(rest).map(([k, v]) => [k, removeDefaultProperty(v)])
        );
    }
    return obj;
}

function normalizeSchema(schema: any): any {
    if (schema && schema.type === "array") {
        // Wrap array schema in an object with 'items' property
        return {
            type: "object",
            properties: {
                items: schema,
            },
            required: ["items"],
            additionalProperties: false,
        };
    } else if (schema && typeof schema === "object" && !schema.type) {
        // If schema is a plain object (no type), treat as properties
        return {
            type: "object",
            properties: Object.fromEntries(
                Object.entries(schema).map(([key, value]) => {
                    return [key, normalizeSchema(value)];
                })
            ),
            required: Object.keys(schema),
            additionalProperties: false,
        };
    }
    // Remove default property recursively
    return removeDefaultProperty(schema);
}

// Interfaces
interface ExtractOptions {
    prompt?: string;
    maxTokensInput?: number;
    chunkOverlap?: number;
    systemPrompt?: string; //used for override system prompt, and work for once call
    costLimit?: number; //used for override cost limit, and work for once call
    schemaName?: string;
    schemaDescription?: string;
}

interface ExtractResult {
    data: any;
    tokens: {
        input: number;
        output: number;
        total: number;
    };
    chunks: number;
    cost?: number;
}

interface BatchExtractResult {
    results: any[];
    totalTokens: {
        input: number;
        output: number;
        total: number;
    };
    totalChunks: number;
    cost?: number;
}

class LLMExtract extends BaseAgent {
    private systemPrompt: string;
    private textChunker: TextChunker;

    constructor(modelId: string, prompt: string = EXTRACT_SYSTEM_PROMPT, costLimit: number | null = null) {
        super(modelId, costLimit);
        this.systemPrompt = prompt;
        this.textChunker = new TextChunker(this.countTokens.bind(this));
    }

    /**
     * Get system prompt tokens for parameter calculation
     */
    private getSystemPromptTokens(): number {
        return this.countTokens(this.systemPrompt);
    }

    /**
     * Extract field names from schema for prompt construction
     */
    private getSchemaFields(schema: JSONSchema7): string[] {
        if (schema.properties && typeof schema.properties === 'object') {
            return Object.keys(schema.properties);
        }
        return [];
    }

    /**
 * Create field-specific prompt (递归展开所有嵌套字段)
 */
    private createFieldPrompt(schema: JSONSchema7, indent: string = ''): string {
        if (!schema.properties || typeof schema.properties !== 'object') return '';
        const fields = Object.keys(schema.properties);
        if (fields.length === 0) return "";

        const fieldDescriptions = fields.map(field => {
            const propSchema = schema.properties?.[field] as JSONSchema7;
            const type = propSchema?.type || 'any';
            const description = propSchema?.description || '';
            let typeDescription = '';
            if (type === 'array') {
                const items = propSchema.items as JSONSchema7;
                const itemType = items && typeof items === 'object' && 'type' in items ? items.type : 'any';
                typeDescription = `(array of ${itemType}s)`;
                // 递归展开 array 的 item
                if (items && items.type === 'object') {
                    return `${indent}- ${field} ${typeDescription}: ${description}\n${this.createFieldPrompt(items, indent + '    ')}`;
                }
            } else if (type === 'object') {
                typeDescription = '(object)';
                // 递归展开 object
                return `${indent}- ${field} ${typeDescription}: ${description}\n${this.createFieldPrompt(propSchema, indent + '    ')}`;
            } else {
                typeDescription = `(${type})`;
            }
            return `${indent}- ${field} ${typeDescription}: ${description}`;
        }).join('\n');

        return fieldDescriptions;
    }

    /**
     * Merge multiple extraction results
     */
    private mergeResults(results: any[], schema: JSONSchema7): any {
        if (results.length === 0) return null;
        if (results.length === 1) return results[0];

        // Simple merge strategy - you can make this more sophisticated
        const merged: any = {};

        for (const result of results) {
            if (!result) continue;

            for (const [key, value] of Object.entries(result)) {
                if (value === null || value === undefined) continue;

                if (!merged[key]) {
                    merged[key] = value;
                } else if (Array.isArray(merged[key]) && Array.isArray(value)) {
                    // Merge arrays and remove duplicates
                    merged[key] = this.deduplicateArray([...merged[key], ...value]);
                } else if (typeof merged[key] === 'object' && typeof value === 'object') {
                    // Merge objects
                    merged[key] = { ...merged[key], ...value };
                } else {
                    // For primitive values, prefer non-empty values
                    if (merged[key] === null || merged[key] === undefined || merged[key] === '') {
                        merged[key] = value;
                    }
                }
            }
        }

        return merged;
    }

    /**
     * Deduplicate array items
     */
    private deduplicateArray(arr: any[]): any[] {
        const seen = new Set();
        return arr.filter(item => {
            const key = typeof item === 'object' ? JSON.stringify(item) : item;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Override getDefaultParams to account for system prompt
     */
    protected getDefaultParams() {
        const baseParams = super.getDefaultParams();

        // Adjust maxTokensInput to account for system prompt
        const systemPromptTokens = this.getSystemPromptTokens();
        const adjustedMaxTokensInput = Math.max(1000, baseParams.maxTokensInput - systemPromptTokens);

        return {
            ...baseParams,
            maxTokensInput: adjustedMaxTokensInput
        };
    }

    /**
     * Unified extraction logic for both single and chunked extraction
     */
    async perform(text: string | string[], schema: JSONSchema7, options: ExtractOptions = {}): Promise<ExtractResult> {
        // --- normalize schema ---
        const normalizedSchema = normalizeSchema(schema);
        // Get default parameters based on model config
        const defaults = this.getDefaultParams();
        const {
            maxTokensInput = defaults.maxTokensInput,
            chunkOverlap = defaults.chunkOverlap
        } = options;

        const inputText = Array.isArray(text) ? text.join('\n') : text;
        const inputTokens = this.countTokens(inputText);

        log.debug(`📊 Model: ${this.modelId}`);
        log.debug(`📏 Input tokens: ${inputTokens}, Max input: ${maxTokensInput}`);

        // If text is short enough, process directly
        if (inputTokens <= maxTokensInput) {
            const { prompt } = options;
            const fieldPrompt = this.createFieldPrompt(normalizedSchema);
            const fullPrompt = buildExtractionPrompt({ prompt: prompt ?? undefined, fieldPrompt, content: inputText });
            log.debug(`🔍 Normalized schema: ${JSON.stringify(normalizedSchema)}`);
            log.debug(`🔍 Full prompt: ${fullPrompt}`);
            try {
                const result = await generateObject({
                    model: this.llm,
                    system: options.systemPrompt || this.systemPrompt || "",
                    messages: [{ role: 'user', content: fullPrompt }],
                    schema: jsonSchema(normalizedSchema),
                });

                const systemPrompt = options.systemPrompt || this.systemPrompt || "";
                const promptTokens = this.countTokens(fullPrompt + systemPrompt);
                const outputTokens = this.countTokens(JSON.stringify(result.object || {}));

                this.trackCall("extract", { direct: true }, promptTokens, outputTokens);

                const finalResult = {
                    data: result.object || result,
                    tokens: {
                        input: promptTokens,
                        output: outputTokens,
                        total: promptTokens + outputTokens
                    },
                    chunks: 1,
                    cost: this.costTracking.getTotalCost()
                };

                // Output cost tracking information
                log.debug(`💰 Cost: $${finalResult.cost.toFixed(6)} | Tokens: ${finalResult.tokens.total}`);
                return finalResult;

            } catch (error) {
                if (NoObjectGeneratedError.isInstance(error)) {
                    log.error('Failed to generate object from LLM response', {
                        cause: error.cause,
                        finishReason: error.finishReason,
                        usage: error.usage
                    });
                } else if (error instanceof Error && error.message.includes('Cost limit exceeded"')) {
                    log.warning('Cost limit exceeded"', {
                        error: error instanceof Error ? error.message : String(error)
                    });
                } else {
                    log.error('Error during extraction:', {
                        error: error instanceof Error ? error.message : String(error)
                    });
                }

                throw error;
            }
        }

        // For longer text, use chunking
        log.debug(`📦 Text too long, splitting into chunks (max: ${maxTokensInput}, overlap: ${chunkOverlap})`);
        const allChunks = this.textChunker.splitMultipleTexts([inputText], {
            maxTokens: maxTokensInput,
            overlapTokens: chunkOverlap
        });
        const allResults: any[] = [];
        for (const [index, chunkInfo] of allChunks.entries()) {
            try {
                log.debug(`⚡ Processing chunk ${index + 1}/${allChunks.length} (${chunkInfo.tokens} tokens)`);
                const fieldPrompt = this.createFieldPrompt(normalizedSchema);
                const fullPrompt = buildExtractionPrompt({ prompt: options.prompt ?? undefined, fieldPrompt, content: chunkInfo.chunk });
                const result = await generateObject({
                    model: this.llm,
                    system: options.systemPrompt || this.systemPrompt || "",
                    messages: [{ role: 'user', content: fullPrompt }],
                    schema: jsonSchema(normalizedSchema),
                });
                allResults.push(result.object);
            } catch (error) {
                log.error(`❌ Error processing chunk ${chunkInfo.startIndex}-${chunkInfo.endIndex}: ${error instanceof Error ? error.message : String(error)}`);
                allResults.push(null);
            }
        }
        this.trackCall("merge", { chunksCount: allChunks.length }, 0, 0);
        const mergedResult = this.mergeResults(allResults, normalizedSchema);
        const totalTokens = this.costTracking.getTotalTokens();
        const finalResult = {
            data: mergedResult,
            tokens: totalTokens,
            chunks: allChunks.length,
            cost: this.costTracking.getTotalCost()
        };
        log.debug(`💰 Total Cost: $${finalResult.cost?.toFixed(6)} | Total Tokens: ${finalResult.tokens.total} | Chunks: ${finalResult.chunks}`);
        return finalResult;
    }

    /**
     * Get chunk statistics for debugging
     */
    public analyzeChunking(text: string, options: ExtractOptions = {}): {
        chunks: ChunkResult[];
        stats: ReturnType<TextChunker['getChunkStats']>;
    } {
        const defaults = this.getDefaultParams();
        const {
            maxTokensInput = defaults.maxTokensInput,
            chunkOverlap = defaults.chunkOverlap
        } = options;

        const chunks = this.textChunker.splitTextIntoChunks(text, {
            maxTokens: maxTokensInput,
            overlapTokens: chunkOverlap
        });

        const stats = this.textChunker.getChunkStats(chunks);

        return { chunks, stats };
    }
}

export { LLMExtract };

export type {
    ExtractOptions,
    ExtractResult,
    BatchExtractResult
};