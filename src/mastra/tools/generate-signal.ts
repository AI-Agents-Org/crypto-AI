import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const generateSignal = createTool({
    id: "generateSignal",
    description: "Gera sinal de LONG/SHORT a partir de pivôs, ATR, EMA e volume",
    inputSchema: z.object({
        symbol: z.string(),
        closes: z.array(z.number()),
        highs: z.array(z.number()),
        lows: z.array(z.number()),
        volumes: z.array(z.number()),
        pivotHighs: z.array(z.number()),
        pivotLows: z.array(z.number()),
        atr: z.array(z.number()),
        ema: z.array(z.number()),
        params: z.object({
            slPct: z.number().default(0.03),
            tpPct: z.number().default(0.06),
            volMultiplier: z.number().default(1.2),
            atrMultiplier: z.number().default(1.5),
            lookbackVolume: z.number().default(10),
        }),
    }),
    execute: async ({ context }) => {
        const { closes, highs, lows, volumes, pivotHighs, pivotLows, atr, ema, params } = context;
        const i = closes.length - 1;
        const price = closes[i];
        const avgVol = volumes.slice(-params.lookbackVolume).reduce((a, b) => a + b, 0) / params.lookbackVolume;
        const tol = atr[atr.length - 1] * params.atrMultiplier;
        const isUp = price > ema[ema.length - 1];
        const isDown = price < ema[ema.length - 1];
        const lastH = pivotHighs.slice(-3);
        const lastL = pivotLows.slice(-3);

        if (lastH.length === 3 && isUp) {
            const maxH = Math.max(...lastH.map(idx => highs[idx]));
            const minH = Math.min(...lastH.map(idx => highs[idx]));
            if (maxH - minH <= tol && price > maxH && volumes[i] > avgVol * params.volMultiplier) {
                return {
                    symbol: context.symbol,
                    side: "LONG",
                    entry: price,
                    stop: price * (1 - params.slPct),
                    tp: price * (1 + params.tpPct),
                };
            }
        }

        if (lastL.length === 3 && isDown) {
            const maxL = Math.max(...lastL.map(idx => lows[idx]));
            const minL = Math.min(...lastL.map(idx => lows[idx]));
            if (maxL - minL <= tol && price < minL && volumes[i] > avgVol * params.volMultiplier) {
                return {
                    symbol: context.symbol,
                    side: "SHORT",
                    entry: price,
                    stop: price * (1 + params.slPct),
                    tp: price * (1 - params.tpPct),
                };
            }
        }

        return null;
    },
});
