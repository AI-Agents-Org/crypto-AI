import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { RSI } from "technicalindicators";

export const calculateRSI = createTool({
    id: "calculateRSI",
    description: "Calcula o RSI para uma série de preços",
    inputSchema: z.object({
        closesRSI: z.array(z.number()),
        periodRSI: z.number().default(14),
    }),
    outputSchema: z.object({
        rsi: z.array(z.number()),
    }),
    execute: async ({ context }) => {
        const rsi = RSI.calculate({ values: context.closesRSI, period: context.periodRSI });
        return { rsi };
    },
});
