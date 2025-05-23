import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { EMA } from "technicalindicators";

export const calculateEMA21 = createTool({
    id: "calculateEMA21",
    description: "Calcula a EMA21 para uma série de preços",
    inputSchema: z.object({
        closesEMA21: z.array(z.number()),
        periodEMA21: z.number().default(21),
    }),
    outputSchema: z.object({
        ema: z.array(z.number()),
    }),
    execute: async ({ context }) => {
        const ema = EMA.calculate({ values: context.closesEMA21, period: context.periodEMA21 });
        return { ema };
    },
});
