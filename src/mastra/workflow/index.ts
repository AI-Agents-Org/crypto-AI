import { createWorkflow, createStep } from "@mastra/core/workflows";
import { fetchMarketData } from "../tools/fetch-market-data";
import { calculateEMA21 } from "../tools/calculate-ema21";
import { calculateEMA50 } from "../tools/calculate-ema50";
import { calculateRSI } from "../tools/calculate-rsi";
import { calculateATR } from "../tools/calculate-atr";
import { detectPivotsEnhanced } from "../tools/detect-pivot-points";
import { z } from 'zod'
import { cryptoAgent } from '../agents/crypto-agent';


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

const cryptoAgentAnalysisOutputSchema = z.string()

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
    symbol: z.string(),
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
    outputSchema: cryptoAgentAnalysisOutputSchema,
    execute: async ({ inputData }): Promise<z.infer<typeof cryptoAgentAnalysisOutputSchema>> => {
        const analysisPrompt = `
**Análise de Mercado e Potenciais Pontos de Entrada**

Analise os dados de mercado fornecidos para identificar potenciais pontos de entrada. Concentre-se nas seguintes métricas e cenários:

* **Indicadores de Tendência:**
    * **Médias Móveis Exponenciais (EMAs):** EMA21 e EMA50. Observe cruzamentos e o posicionamento do preço em relação a elas.
    * **Índice de Força Relativa (RSI):** Identifique condições de sobrecompra/sobrevenda e divergências.
* **Níveis de Suporte e Resistência:**
    * **Pontos de Pivô do Último Candle:** R1, R2, R3 (resistências) e S1, S2, S3 (suportes).
* **Contexto Temporal:** Compare o cenário atual com padrões históricos semelhantes para confirmar a força do sinal.
* **Observações:** Os dados fornecidos estão em ordem crescente de tempo. O último dado da lista é o mais recente. Utilize essa informação para observar padrões nos arrays.

**Dados de Entrada:**
* **Símbolo:** ${inputData.symbol}
* **EMA21:** ${inputData.ema21.slice().join(', ')}
* **EMA50:** ${inputData.ema50.slice().join(', ')}
* **RSI:** ${inputData.rsi.slice().join(', ')}
* **ATR:** ${inputData.atr.slice().join(', ')}

**Pivôs do Último Candle:**

* **R1:** ${inputData.pivotHighs[0]?.r1}
* **R2:** ${inputData.pivotHighs[0]?.r2}
* **R3:** ${inputData.pivotHighs[0]?.r3}
* **S1:** ${inputData.pivotLows[0]?.s1}
* **S2:** ${inputData.pivotLows[0]?.s2}
* **S3:** ${inputData.pivotLows[0]?.s3}

---

**Instruções para o Agente de IA:**

Com base nos dados fornecidos e na sua especialização em mercado de perpetuals, siga estas etapas:

1.  **Observações Iniciais:** Forneça um resumo conciso das condições atuais do mercado, destacando as tendências de preço (EMAs), a força do momentum (RSI) e os níveis de pivô relevantes.

2.  **Identificação de Cenários de Negociação:**
    * Identifique pelo menos um (1) cenário de negociação potencial (compra ou venda).
    * Para cada cenário, **justifique** a recomendação com base na **confluência** dos indicadores (RSI, EMAs, Pivôs).
    * **Priorize** cenários onde a confluência é mais forte e há precedentes históricos semelhantes.

3.  **Recomendação de Negociação Detalhada:** Para cada cenário identificado, forneça uma recomendação de negociação clara, incluindo:
    * **Direção:** Compra/Venda (Long/Short).
    * **Entrada (EN):** Preço ou faixa de preço sugerido.
    * **Stop Loss (SL):** Nível de preço para limitar perdas.
    * **Take Profit (TP):** Nível de preço para realização de lucros (mínimo de 1 TP, idealmente 2 ou 3).
    * **Força do Sinal:** Uma porcentagem (0-100%) indicando a confiança no sinal, baseada na confluência e no contexto temporal.

4.  **Mensagem final (tools.sendTelegram):**
    * Contextualize a análise para o usuário entender a situação.
    * Utilize emojis para melhor UX.
    * Inclua os detalhes do sinal de negociação (SL, TP, ENTRADA, SAÍDA) de forma clara no corpo da mensagem.
    * Sempre envie uma mensagem ao final da análise.
    * Caso os dados não sejam satisfatórios nem para LONG nem para SHORT, envie uma mensagem informando que não há oportunidades de negociação.

        `;
        const agentResponse = await cryptoAgent.generate(analysisPrompt);
        const analysisText = typeof agentResponse === 'string' ? agentResponse : (agentResponse?.text || "No analysis provided by agent.");
        const result: z.infer<typeof cryptoAgentAnalysisOutputSchema> = analysisText
        return result;
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

    outputSchema: cryptoAgentAnalysisOutputSchema,

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
    }).branch([
        [
            async ({ inputData }) => {
                const res = {
                    pivotHighs: inputData?.pivotHighs,
                    pivotLows: inputData?.pivotLows,
                    ema21: inputData?.ema21,
                    ema50: inputData?.ema50,
                    rsi: inputData?.rsi,
                    atr: inputData?.atr,
                    symbol: inputData?.symbol
                }
                return res
            },
            cryptoAgentAnalysisStep
        ]
    ])


getMarketAnalysisWorkflow.commit()