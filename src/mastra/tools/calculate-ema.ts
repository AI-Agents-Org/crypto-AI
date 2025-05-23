import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { EMA } from "technicalindicators";

export const calculateEMA = createTool({
    id: "calculateEMA",
    description: "Calcula a EMA para uma série de preços",
    inputSchema: z.object({
        closes: z.array(z.number()),
        period: z.number().default(29),
    }),
    outputSchema: z.object({
        ema: z.array(z.number()),
    }),
    execute: async ({ context }) => {
        const ema = EMA.calculate({ values: context.closes, period: context.period });
        return { ema };
    },
});
