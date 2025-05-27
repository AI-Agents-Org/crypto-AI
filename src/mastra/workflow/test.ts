import { mastra } from "../index"; // Import the existing Mastra instance
import dotenv from "dotenv";
import { getTopFutures } from "../../helpers-dev/ccxt/get-top-futures";

dotenv.config();
async function runMarketAnalysisTest() {
    const now = new Date();
    console.log("Using existing Mastra instance for workflow test...");

    // The Mastra instance is already configured with agents and workflows in ../index.ts
    // So, we can directly get the workflow.
    console.log("Getting workflow: getMarketAnalysisWorkflow...");
    const workflow = mastra.getWorkflow('getMarketAnalysisWorkflow');

    if (!workflow) {
        console.error("Failed to get the workflow 'getMarketAnalysisWorkflow'. " +
            "Check if it's registered in the main Mastra instance (src/mastra/index.ts) " +
            "and the ID matches.");
        return;
    }

    const topFutures = await getTopFutures();

    const analyzeSymbols = [topFutures[3], topFutures[5], topFutures[13], topFutures[15]]


    for (const symbol of analyzeSymbols) {
        console.log("Creating workflow run...");
        const run = workflow.createRun();

        const inputData = {
            symbol: symbol,    // Example symbol
            timeframe: "1h",        // Example timeframe
            limit: 100,              // Using a small limit for testing purposes
        };

        console.log(`Starting workflow 'getMarketAnalysisWorkflow' with input: ${JSON.stringify(inputData)}`);

        try {
            // Start the workflow run with the specified input data
            const result = await run.start({ inputData });

            if (result.status === "success") {
                console.log("Workflow 'getMarketAnalysisWorkflow' completed successfully!");
                // According to Mastra docs, the actual output is in result.result if the workflow has an outputSchema
                console.log("Workflow Output:", JSON.stringify(result.result, null, 2));
            } else if (result.status === "failed") {
                console.error("Workflow 'getMarketAnalysisWorkflow' failed.");
                console.error("Error details:", JSON.stringify(result.error, null, 2));
            } else {
                // Handle other potential statuses like 'suspended', 'running', etc.
                console.log(`Workflow 'getMarketAnalysisWorkflow' status: ${result.status}`);
                console.log("Full result object:", JSON.stringify(result, null, 2));
            }
        } catch (error) {
            console.error("An unexpected error occurred while running the workflow:", error);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }
    const end = new Date();
    console.log(`Tempo total de execução: ${((end.getTime() - now.getTime()) / 1000).toFixed(2)}s`);
}

// Execute the test function
runMarketAnalysisTest().catch(error => {
    console.error("Unhandled error during test execution:", error);
}); 