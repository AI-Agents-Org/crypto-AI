import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { EMA } from "technicalindicators";

export const calculateEMA50 = createTool({
    id: "calculateEMA50",
    description: "Calcula a EMA50 para uma série de preços",
    inputSchema: z.object({
        closesEMA50: z.array(z.number()),
        periodEMA50: z.number().default(50),
    }),
    outputSchema: z.object({
        ema: z.array(z.number()),
    }),
    execute: async ({ context }) => {
        const ema = EMA.calculate({ values: context.closesEMA50, period: context.periodEMA50 });
        return { ema };
    },
});
