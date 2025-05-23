import { createWorkflow, createStep } from "@mastra/core/workflows";
import { fetchMarketData } from "../tools/fetch-market-data";
import { calculateEMA21 } from "../tools/calculate-ema21";
import { calculateEMA50 } from "../tools/calculate-ema50";
import { calculateRSI } from "../tools/calculate-rsi";
import { z } from 'zod'
import { calculateATR } from "../tools/calculate-atr";



const fetchDataStep = createStep(fetchMarketData)
const calculateEMAStep21 = createStep(calculateEMA21)
const calculateEMAStep50 = createStep(calculateEMA50)
const calculateRSIStep = createStep(calculateRSI)
const calculateATRStep = createStep(calculateATR)


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



const setDataToCalculateEMA21Step = createStep({
    id: "set-data-to-calculate-ema21",

    inputSchema: fetchDataStep.outputSchema,

    outputSchema: calculateEMAStep21.inputSchema,

    execute: async ({ inputData }) => {
        return {
            closesEMA21: inputData.map((item) => item.close),

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
            closesEMA50: inputData.map((item) => item.close),
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

            closesRSI: inputData.map((item) => item.close),

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

            highs: inputData.map((item) => item.high),

            lows: inputData.map((item) => item.low),

            closes: inputData.map((item) => item.close),

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
        getOutputStep
    ],

    inputSchema: z.object({

        symbol: z.string(),

        timeframe: z.string().default("1h"),

        limit: z.number().default(100),

    }),

    outputSchema: z.object({
        ema21: z.array(z.number()),
        ema50: z.array(z.number()),
        rsi: z.array(z.number()),
        atr: z.array(z.number()),
    }),

}).then(fetchDataStep)
    .parallel([
        setDataToCalculateRSIStep,
        setDataToCalculateEMA21Step,
        setDataToCalculateEMA50Step,
        setDataToCalculateATRStep
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

// export const getMarketAnalysisWorkflow = createWorkflow({
//     id: 'market-analysis-workflow',

//     steps: [
//         fetchDataStep,
//         setDataToCalculateEMAStep,
//         setDataToCalculateRSIStep,
//         setDataToCalculateATRStep,
//         calculateEMAStep,
//         calculateRSIStep,
//         calculateATRStep,
//         getOutputStep
//     ],

//     inputSchema: z.object({

//         symbol: z.string(),

//         timeframe: z.string().default("1h"),

//         limit: z.number().default(100),

//     }),

//     outputSchema: z.object({
//         ema: z.array(z.number()),
//         rsi: z.array(z.number()),
//         atr: z.array(z.number()),
//     }),

// }).then(fetchDataStep).branch([
//     [
//         async ({ inputData }) => {
//             return inputData
//         },
//         setDataToCalculateEMAStep
//     ],
//     [
//         async ({ inputData }) => {
//             return inputData
//         },
//         setDataToCalculateRSIStep
//     ],
//     [
//         async ({ inputData }) => {
//             return inputData
//         },
//         setDataToCalculateATRStep
//     ]
// ])

getMarketAnalysisWorkflow.commit()