import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const detectPivots = createTool({
    id: "detectPivots",
    description: "Encontra índices de pivôs altos e baixos em candles",
    inputSchema: z.object({
        highs: z.array(z.number()),
        lows: z.array(z.number()),
        left: z.number().default(2),
        right: z.number().default(2),
    }),
    execute: async ({ context }) => {
        const { highs, lows, left, right } = context;
        const pivotHighs: number[] = [];
        const pivotLows: number[] = [];
        for (let i = left; i < highs.length - right; i++) {
            const winH = highs.slice(i - left, i + right + 1);
            const winL = lows.slice(i - left, i + right + 1);
            if (winH.every(v => highs[i] >= v)) pivotHighs.push(i);
            if (winL.every(v => lows[i] <= v)) pivotLows.push(i);
        }
        return { pivotHighs, pivotLows };
    },
});
