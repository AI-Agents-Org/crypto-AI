import { createWorkflow, createStep } from "@mastra/core/workflows";
import { fetchMarketData } from "../tools/fetch-market-data";
import { calculateEMA } from "../tools/calculate-ema";
import { z } from 'zod'

const fetchDataStep = createStep(fetchMarketData)
const calculateEMAStep = createStep(calculateEMA)



export const getEMAWorkflow = createWorkflow({
    id: 'market-analysis-workflow',
    steps: [fetchDataStep],
    inputSchema: z.object({
        symbol: z.string(),
        timeframe: z.string().default("1h"),
        limit: z.number().default(100),
    }),
    outputSchema: z.object({
        ema: z.array(z.number()),
    }),
}).then(fetchDataStep).then(createStep({
    id: "set-data-to-calculate-ema",
    inputSchema: fetchDataStep.outputSchema,
    outputSchema: calculateEMAStep.inputSchema,
    execute: async ({ inputData }) => {
        return {
            closes: inputData.map((item) => item.close),
            period: inputData.length,
        }
    }
})).then(calculateEMAStep)

getEMAWorkflow.commit()