import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { ATR } from "technicalindicators";

export const calculateATR = createTool({
    id: "calculateATR",
    description: "Calcula o ATR para um conjunto de candles",
    inputSchema: z.object({
        highs: z.array(z.number()),
        lows: z.array(z.number()),
        closes: z.array(z.number()),
        period: z.number().default(14),
    }),
    execute: async ({ context }) => {
        return ATR.calculate({
            high: context.highs,
            low: context.lows,
            close: context.closes,
            period: context.period,
        });
    },
});
