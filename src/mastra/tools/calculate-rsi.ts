import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { RSI } from "technicalindicators";

export const calculateRSI = createTool({
    id: "calculateRSI",
    description: "Calcula o RSI para uma série de preços",
    inputSchema: z.object({
        closes: z.array(z.number()),
        period: z.number().default(14),
    }),
    execute: async ({ context }) => {
        const rsiValues = RSI.calculate({ values: context.closes, period: context.period });
        return rsiValues;
    },
});
