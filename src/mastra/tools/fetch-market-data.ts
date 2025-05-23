import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import ccxt from "ccxt";

export const fetchMarketData = createTool({
    id: "fetchMarketData",
    description: "Busca dados de mercado para um par de moedas",
    inputSchema: z.object({
        symbol: z.string(),
        timeframe: z.string().default("1h"),
        limit: z.number().default(100),
    }),
    outputSchema: z.array(
        z.object({
            timestamp: z.number(),
            open: z.number(),
            high: z.number(),
            low: z.number(),
            close: z.number(),
            volume: z.number(),
        })
    ),
    execute: async ({ context }) => {
        const exchange = new ccxt.bybit({
            enableRateLimit: true,
            options: { defaultType: 'future' },
            apiKey: process.env.BYBIT_API_KEY,
            secret: process.env.BYBIT_API_SECRET,
        });

        const ohlcv = await exchange.fetchOHLCV(context.symbol, context.timeframe, undefined, context.limit);
        return ohlcv.map((candle) => ({
            timestamp: Number(candle[0]),
            open: Number(candle[1]),
            high: Number(candle[2]),
            low: Number(candle[3]),
            close: Number(candle[4]),
            volume: Number(candle[5]),
        }));
    },
});
