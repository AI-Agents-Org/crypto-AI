import { createWorkflow, createStep } from "@mastra/core/workflows";
import { fetchMarketData } from "../tools/fetch-market-data";
import { calculateEMA21 } from "../tools/calculate-ema21";
import { calculateEMA50 } from "../tools/calculate-ema50";
import { calculateRSI } from "../tools/calculate-rsi";
import { calculateATR } from "../tools/calculate-atr";
import { detectPivotsEnhanced } from "../tools/detect-pivot-points";
import { z } from 'zod'
import { sendTelegram } from "../tools/notification-sender";

const fetchDataStep = createStep(fetchMarketData)
const calculateEMAStep21 = createStep(calculateEMA21)
const calculateEMAStep50 = createStep(calculateEMA50)
const calculateRSIStep = createStep(calculateRSI)
const calculateATRStep = createStep(calculateATR)
const detectPivotsEnhancedStep = createStep(detectPivotsEnhanced)



const getOutputStep = createStep({
    id: "get-output-step",

    inputSchema: z.object({
        [calculateEMAStep21.id]: calculateEMAStep21.outputSchema,
        [calculateEMAStep50.id]: calculateEMAStep50.outputSchema,
        [calculateRSIStep.id]: calculateRSIStep.outputSchema,
        [calculateATRStep.id]: calculateATRStep.outputSchema,
    }),

    outputSchema: z.object({
        ema21: z.array(z.number()),
        ema50: z.array(z.number()),
        rsi: z.array(z.number()),
        atr: z.array(z.number()),

    }),

    execute: async ({ inputData }) => {
        const ema21Output = inputData[calculateEMAStep21.id] as z.infer<typeof calculateEMAStep21.outputSchema>;
        const ema50Output = inputData[calculateEMAStep50.id] as z.infer<typeof calculateEMAStep50.outputSchema>;
        const rsiOutput = inputData[calculateRSIStep.id] as z.infer<typeof calculateRSIStep.outputSchema>;
        const atrOutput = inputData[calculateATRStep.id] as z.infer<typeof calculateATRStep.outputSchema>;
        return {
            ema21: ema21Output.ema,
            ema50: ema50Output.ema,
            rsi: rsiOutput.rsi,
            atr: atrOutput.atr,
        };
    }
})



// Esquema para um objeto individual dentro de pivotHighs
const pivotHighObjectSchema = z.object({
    r1: z.number(),
    r2: z.number(),
    r3: z.number(),
});

// Esquema para um objeto individual dentro de pivotLows
const pivotLowObjectSchema = z.object({
    s1: z.number(),
    s2: z.number(),
    s3: z.number(),
});


// Esquema principal para cryptoAgentAnalysisInput
const cryptoAgentAnalysisInputSchema = z.object({
    candles: z.array(z.object({
        open: z.number(),
        high: z.number(),
        low: z.number(),
        close: z.number(),
        volume: z.number(),
    })),
    symbol: z.string(),
    timeframe: z.string(),
    pivotHighs: z.array(pivotHighObjectSchema),
    pivotLows: z.array(pivotLowObjectSchema),
    ema21: z.array(z.number()),
    ema50: z.array(z.number()),
    rsi: z.array(z.number()),
    atr: z.array(z.number()),
});

const cryptoAgentAnalysisStep = createStep({
    id: "crypto-agent-analysis-step",
    inputSchema: cryptoAgentAnalysisInputSchema,
    outputSchema: cryptoAgentAnalysisInputSchema,
    execute: async ({ inputData }): Promise<z.infer<typeof cryptoAgentAnalysisInputSchema>> => {

        return {
            ...inputData,
            candles: inputData.candles.slice(-10),
        }
    }
});


const setDataToCalculateEMA21Step = createStep({
    id: "set-data-to-calculate-ema21",

    inputSchema: fetchDataStep.outputSchema,

    outputSchema: calculateEMAStep21.inputSchema,

    execute: async ({ inputData }) => {
        return {
            closesEMA21: inputData.ohlcvFormatted.map((item) => item.close),

            periodEMA21: 21,
        }

    }

})


const setDataToCalculateEMA50Step = createStep({
    id: "set-data-to-calculate-ema50",

    inputSchema: fetchDataStep.outputSchema,

    outputSchema: calculateEMAStep50.inputSchema,

    execute: async ({ inputData }) => {
        return {
            closesEMA50: inputData.ohlcvFormatted.map((item) => item.close),
            periodEMA50: 50,
        }
    }
})


const setDataToCalculateRSIStep = createStep({
    id: "set-data-to-calculate-rsi",

    inputSchema: fetchDataStep.outputSchema,

    outputSchema: calculateRSIStep.inputSchema,

    execute: async ({ inputData }) => {
        return {

            closesRSI: inputData.ohlcvFormatted.map((item) => item.close),

            periodRSI: 14,

        }

    }

})



const setDataToCalculateATRStep = createStep({
    id: "set-data-to-calculate-atr",

    inputSchema: fetchDataStep.outputSchema,

    outputSchema: calculateATRStep.inputSchema,

    execute: async ({ inputData }) => {
        return {

            highs: inputData.ohlcvFormatted.map((item) => item.high),

            lows: inputData.ohlcvFormatted.map((item) => item.low),

            closes: inputData.ohlcvFormatted.map((item) => item.close),

            period: 14,

        }

    }

})

export const getMarketAnalysisWorkflow = createWorkflow({
    id: 'market-analysis-workflow',

    steps: [
        fetchDataStep,
        setDataToCalculateEMA21Step,
        setDataToCalculateRSIStep,
        setDataToCalculateATRStep,
        calculateEMAStep21,
        calculateEMAStep50,
        calculateRSIStep,
        calculateATRStep,
        getOutputStep,
        detectPivotsEnhancedStep,
        cryptoAgentAnalysisStep
    ],

    inputSchema: fetchDataStep.inputSchema,

    outputSchema: cryptoAgentAnalysisInputSchema,

})


getMarketAnalysisWorkflow.then(fetchDataStep)
    .parallel([
        setDataToCalculateRSIStep,
        setDataToCalculateEMA21Step,
        setDataToCalculateEMA50Step,
        setDataToCalculateATRStep,
    ])
    .map({
        closesEMA21: {
            step: setDataToCalculateEMA21Step,
            path: "closesEMA21"
        },
        periodEMA21: {
            step: setDataToCalculateEMA21Step,
            path: "periodEMA21"
        },
        closesEMA50: {
            step: setDataToCalculateEMA50Step,
            path: "closesEMA50"
        },
        periodEMA50: {
            step: setDataToCalculateEMA50Step,
            path: "periodEMA50"
        },
        closesRSI: {
            step: setDataToCalculateRSIStep,
            path: "closesRSI"
        },
        periodRSI: {
            step: setDataToCalculateRSIStep,
            path: "periodRSI"
        },
        highs: {
            step: setDataToCalculateATRStep,
            path: "highs"
        },
        lows: {
            step: setDataToCalculateATRStep,
            path: "lows"
        },
        closes: {
            step: setDataToCalculateATRStep,
            path: "closes"
        },
        period: {
            step: setDataToCalculateATRStep,
            path: "period"
        }
    }).branch([
        [
            async ({ inputData }) => {
                return {
                    closesRSI: inputData?.closesRSI,
                    periodRSI: inputData?.periodRSI
                }
            },
            calculateRSIStep
        ],
        [
            async ({ inputData }) => {
                return {
                    closesEMA21: inputData?.closesEMA21,
                    periodEMA21: inputData?.periodEMA21
                }
            },
            calculateEMAStep21
        ],
        [
            async ({ inputData }) => {
                return {
                    closesEMA50: inputData?.closesEMA50,
                    periodEMA50: inputData?.periodEMA50
                }
            },
            calculateEMAStep50
        ],
        [
            async ({ inputData }) => {
                return {
                    highs: inputData?.highs,
                    lows: inputData?.lows,
                    closes: inputData?.closes,
                    period: inputData?.period
                }
            },
            calculateATRStep
        ]
    ])
    .then(getOutputStep)
    .map({
        candles: {
            step: fetchDataStep,
            path: "ohlcvFormatted"
        },
        atrValues: {
            step: calculateATRStep,
            path: "atr"
        }
    }).branch([
        [
            async ({ inputData }) => {
                return {
                    candles: inputData?.candles,
                    atrValues: inputData?.atrValues,
                    leftBars: 2,
                    rightBars: 2,
                    atrMultiplierForSignificance: 0.5
                }
            },
            detectPivotsEnhancedStep
        ]
    ]).map({
        candles: {
            step: fetchDataStep,
            path: "ohlcvFormatted"
        },
        pivotHighs: {
            step: detectPivotsEnhancedStep,
            path: "pivotHighs"
        },
        pivotLows: {
            step: detectPivotsEnhancedStep,
            path: "pivotLows"
        },
        ema21: {
            step: getOutputStep,
            path: "ema21"
        },
        ema50: {
            step: getOutputStep,
            path: "ema50"
        },
        rsi: {
            step: getOutputStep,
            path: "rsi"
        },
        atr: {
            step: getOutputStep,
            path: "atr"
        },
        symbol: {
            initData: getMarketAnalysisWorkflow,
            path: "symbol",
        },
        timeframe: {
            initData: getMarketAnalysisWorkflow,
            path: "timeframe",
        }
    }).branch([
        [
            async ({ inputData }) => {
                const res = {
                    candles: inputData?.candles,
                    pivotHighs: inputData?.pivotHighs,
                    pivotLows: inputData?.pivotLows,
                    ema21: inputData?.ema21,
                    ema50: inputData?.ema50,
                    rsi: inputData?.rsi,
                    atr: inputData?.atr,
                    symbol: inputData?.symbol,
                    timeframe: inputData?.timeframe
                }
                return res
            },
            cryptoAgentAnalysisStep
        ]
    ])

getMarketAnalysisWorkflow.commit()