import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const candleSchema = z.object({
    timestamp: z.number(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().optional(),
});

const pivotPointSchemaHighs = z.object({
    r1: z.number().describe("Ponto de pivô nível 1"),
    r2: z.number().describe("Ponto de pivô nível 2"),
    r3: z.number().describe("Ponto de pivô nível 3"),
})
const pivotPointSchemaLows = z.object({
    s1: z.number().describe("Ponto de pivô nível 1"),
    s2: z.number().describe("Ponto de pivô nível 2"),
    s3: z.number().describe("Ponto de pivô nível 3"),
})


export const detectPivotsEnhanced = createTool({
    id: "detectPivotsEnhanced",
    description: "Encontra pivôs altos e baixos em uma série de candles, retornando índice, preço e timestamp.",
    inputSchema: z.object({
        candles: z.array(candleSchema),
        leftBars: z.number().default(3).describe("Número de barras à esquerda para definir um pivô."),
        rightBars: z.number().default(3).describe("Número de barras à direita para definir um pivô."),
        atrValues: z.array(z.number()).optional().describe("Valores de ATR correspondentes aos candles para filtrar pivôs."),
        atrMultiplierForSignificance: z.number().min(0).default(0.5).describe("Multiplicador do ATR. Um pivô deve ter uma 'altura' mínima em relação aos vizinhos (Ex: 0.5 * ATR). 0 desabilita."),
    }),
    outputSchema: z.object({
        pivotHighs: z.array(pivotPointSchemaHighs),
        pivotLows: z.array(pivotPointSchemaLows),
    }),
    execute: async ({ context }) => {
        const { candles } = context;

        if (!candles || candles.length === 0) {
            console.error("Erro: O array de candles está vazio ou não foi definido. Não é possível calcular os pontos de pivô.");
            return { pivotHighs: [], pivotLows: [] };
        }

        const previousCandle = candles[candles.length - 1];

        if (!previousCandle || typeof previousCandle.high !== 'number' || typeof previousCandle.low !== 'number' || typeof previousCandle.close !== 'number') {
            console.error("Erro: Dados HLC inválidos no candle anterior para cálculo de ponto de pivô.");
            return { pivotHighs: [], pivotLows: [] };
        }

        const { high, low, close } = previousCandle;

        const pp = (high + low + close) / 3;

        const r1 = (2 * pp) - low;
        const r2 = pp + (high - low);
        const r3 = high + 2 * (pp - low);

        const s1 = (2 * pp) - high;
        const s2 = pp - (high - low);
        const s3 = low - 2 * (high - pp);

        const pivotHighs = [{ r1, r2, r3 }];
        const pivotLows = [{ s1, s2, s3 }];

        return { pivotHighs, pivotLows };
    }
});