import { LLMExtract, BaseAgent, CostTracking, TextChunker } from "./index.js";
import { JSONSchema7 } from "ai";

async function testRefactoredArchitecture() {
    console.log("🔧 Testing Refactored Architecture\n");

    // Test 1: BaseAgent capabilities
    console.log("1️⃣ Testing BaseAgent through LLMExtract");
    const extractor = new LLMExtract("openrouter/openai/gpt-3.5-turbo");

    const capabilities = extractor.getModelCapabilities();
    console.log("Model Capabilities:", capabilities);

    // Test 2: TextChunker independently
    console.log("\n2️⃣ Testing TextChunker independently");
    const chunker = new TextChunker((text) => Math.ceil(text.length / 4)); // Simple token counter

    const testText = "This is a test text.\n".repeat(50);
    const chunks = chunker.splitTextIntoChunks(testText, {
        maxTokens: 100,
        overlapTokens: 20
    });

    const stats = chunker.getChunkStats(chunks);
    console.log("Chunk Statistics:", stats);

    // Test 3: Cost tracking
    console.log("\n3️⃣ Testing CostTracking independently");
    const costTracker = new CostTracking(0.01); // $0.01 limit

    costTracker.addCall({
        type: "extract",
        metadata: { test: true },
        cost: 0.0001,
        model: "test-model",
        tokens: { input: 100, output: 50 }
    });

    console.log("Cost Summary:");
    costTracker.printSummary();

    // Test 4: Full extraction with new architecture
    console.log("\n4️⃣ Testing full extraction");
    const schema: JSONSchema7 = {
        type: "object",
        properties: {
            summary: { type: "string" },
            keywords: {
                type: "array",
                items: { type: "string" }
            }
        }
    };

    try {
        const result = await extractor.perform(
            "Artificial Intelligence is transforming the world. Machine learning and deep learning are key technologies.",
            schema,
            { prompt: "Extract summary and keywords" }
        );

        console.log("Extraction Result:", {
            data: result.data,
            tokens: result.tokens,
            cost: result.cost
        });

        // Show cost summary
        console.log("\nFinal Cost Summary:");
        extractor.printCostSummary();

        // Test chunk analysis
        console.log("\n5️⃣ Testing chunk analysis");
        const longText = "AI and ML are revolutionary technologies.\n".repeat(100);
        const chunkAnalysis = extractor.analyzeChunking(longText);
        console.log("Chunk Analysis:", {
            totalChunks: chunkAnalysis.stats.totalChunks,
            avgTokensPerChunk: chunkAnalysis.stats.averageTokensPerChunk,
            totalTokens: chunkAnalysis.stats.totalTokens
        });

    } catch (error) {
        console.error("Error during extraction:", error);
    }
}

// Architecture benefits demonstration
function demonstrateArchitectureBenefits() {
    console.log("\n\n✨ Architecture Benefits:");
    console.log("1. BaseAgent - Reusable base for all AI agents");
    console.log("   - Token counting");
    console.log("   - Cost tracking");
    console.log("   - Model configuration");
    console.log("   - Can be extended for other agent types\n");

    console.log("2. TextChunker - Independent text chunking utility");
    console.log("   - Can be used by any agent");
    console.log("   - Testable in isolation");
    console.log("   - Configurable chunking strategies\n");

    console.log("3. CostTracking - Standalone cost tracking");
    console.log("   - Detailed cost analysis");
    console.log("   - Multiple output formats");
    console.log("   - Cost limits and alerts\n");

    console.log("4. Clean separation of concerns");
    console.log("   - Each class has a single responsibility");
    console.log("   - Easy to test and maintain");
    console.log("   - Flexible and extensible");
}

export { testRefactoredArchitecture, demonstrateArchitectureBenefits };

// Run if called directly
if (import.meta.url === new URL(import.meta.url).href) {
    testRefactoredArchitecture()
        .then(() => demonstrateArchitectureBenefits())
        .catch(console.error);
} 