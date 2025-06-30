import { generateObject, JSONSchema7, jsonSchema } from "ai";
import { BaseAgent } from "./BaseAgent.js";
import { TextChunker, ChunkResult } from "./TextChunker.js";
import { log } from "@anycrawl/libs";

const extractPrompt = `Analyze the given Markdown content from a web page and produce a JSON object that strictly follows the provided schema. Follow these steps:

<thinking>
1. Carefully review the schema to understand the expected structure and data types.
2. Examine the Markdown content and identify all the relevant information needed to populate the schema fields.
3. For each schema field, extract the corresponding data from the Markdown content, ensuring that the data type matches the schema requirements.
4. If any schema field is missing data in the Markdown content, use 'null' to represent the missing information.
5. Construct the final JSON object by combining all the extracted data, following the schema structure exactly.
6. Validate the JSON object to ensure it is a valid and well-formed representation of the Markdown content.
</thinking>

<result>
{
/* Populate the JSON object here, strictly following the provided schema */
}
</result>

Remember, your only goal is to produce a valid JSON object that accurately represents the Markdown content, without making any assumptions or inferences beyond what is explicitly stated in the input data.`;

// Interfaces
interface ExtractOptions {
    prompt?: string;
    maxTokensInput?: number;
    chunkOverlap?: number;
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

    constructor(modelId: string, prompt: string = extractPrompt, costLimit: number | null = null) {
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
     * Extract from a single chunk
     */
    private async extractFromChunk(chunk: string, schema: JSONSchema7, options: ExtractOptions): Promise<any> {
        const { prompt = null } = options;

        const fullPrompt = prompt
            ? `Transform the following content into structured JSON output based on the provided schema and this user request: ${prompt}. If schema is provided, strictly follow it.\n\n${chunk}`
            : `Transform the following content into structured JSON output based on the provided schema if any.\n\n${chunk}`;

        const result = await generateObject({
            model: this.llm,
            schema: jsonSchema(schema),
            prompt: fullPrompt,
            system: this.systemPrompt || "",
            maxRetries: 3,
        });

        // Calculate actual cost based on model config
        const inputTokens = this.countTokens(fullPrompt + this.systemPrompt);
        const outputTokens = this.countTokens(JSON.stringify(result.object || {}));

        // Track cost
        this.trackCall("extract", { chunkLength: chunk.length }, inputTokens, outputTokens);

        return result;
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
     * Single extraction method
     */
    async perform(text: string | string[], schema: JSONSchema7, options: ExtractOptions = {}): Promise<ExtractResult> {
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
            const { prompt = null } = options;

            const fullPrompt = prompt
                ? `Transform the following content into structured JSON output based on the provided schema and this user request: ${prompt}. If schema is provided, strictly follow it.\n\n${inputText}`
                : `Transform the following content into structured JSON output based on the provided schema if any.\n\n${inputText}`;

            const result = await generateObject({
                model: this.llm,
                schema: jsonSchema(schema),
                prompt: fullPrompt,
                system: this.systemPrompt || "",
                maxRetries: 3,
            });

            const promptTokens = this.countTokens(fullPrompt + this.systemPrompt);
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
        }

        // For longer text, use chunking
        log.debug(`📦 Text too long, splitting into chunks (max: ${maxTokensInput}, overlap: ${chunkOverlap})`);
        const batchResult = await this.performBatchExtract([inputText], schema, { ...options, maxTokensInput, chunkOverlap });
        const mergedResult = this.mergeResults(batchResult.results, schema);

        const finalResult = {
            data: mergedResult,
            tokens: batchResult.totalTokens,
            chunks: batchResult.totalChunks,
            cost: batchResult.cost
        };

        // Output cost tracking information
        log.debug(`💰 Total Cost: $${finalResult.cost?.toFixed(6)} | Total Tokens: ${finalResult.tokens.total} | Chunks: ${finalResult.chunks}`);

        return finalResult;
    }

    /**
     * Batch extraction method for multiple texts or chunks
     */
    async performBatchExtract(texts: string[], schema: JSONSchema7, options: ExtractOptions = {}): Promise<BatchExtractResult> {
        const defaults = this.getDefaultParams();
        const {
            maxTokensInput = defaults.maxTokensInput,
            chunkOverlap = defaults.chunkOverlap
        } = options;

        // Use TextChunker to split texts
        const allChunks = this.textChunker.splitMultipleTexts(texts, {
            maxTokens: maxTokensInput,
            overlapTokens: chunkOverlap
        });

        const allResults: any[] = [];

        log.debug(`📦 Processing ${allChunks.length} chunks`);

        // Process each chunk
        for (const [index, chunkInfo] of allChunks.entries()) {
            try {
                log.debug(`⚡ Processing chunk ${index + 1}/${allChunks.length} (${chunkInfo.tokens} tokens)`);
                const result = await this.extractFromChunk(chunkInfo.chunk, schema, options);
                allResults.push(result.object);
            } catch (error) {
                log.error(`❌ Error processing chunk ${chunkInfo.startIndex}-${chunkInfo.endIndex}: ${error instanceof Error ? error.message : String(error)}`);
                allResults.push(null);
            }
        }

        // Track merge operation
        this.trackCall("merge", { chunksCount: allChunks.length }, 0, 0);

        const totalTokens = this.costTracking.getTotalTokens();

        return {
            results: allResults,
            totalTokens,
            totalChunks: allChunks.length,
            cost: this.costTracking.getTotalCost()
        };
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