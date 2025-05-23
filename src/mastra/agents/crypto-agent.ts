import { Agent } from "@mastra/core/agent";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { fetchMarketData } from "../tools/fetch-market-data";
import { calculateRSI } from "../tools/calculate-rsi";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { fastembed } from "@mastra/fastembed";
import { calculateATR } from "../tools/calculate-atr";
import { calculateEMA21 } from "../tools/calculate-ema21";
import { calculateEMA50 } from "../tools/calculate-ema50";
import { detectPivots } from "../tools/detect-pivot-points";
import { generateSignal } from "../tools/generate-signal";
import { sendTelegram } from "../tools/notification-sender";

const memory = new Memory({
    storage: new LibSQLStore({
        url: "file:../mastra.db",
    }),
    vector: new LibSQLVector({
        connectionUrl: "file:../mastra.db",
    }),
    embedder: fastembed,
    options: {
        lastMessages: 40,
        semanticRecall: {
            topK: 2,
            messageRange: { before: 2, after: 2 }
        },
        threads: { generateTitle: true }
    }
});

export const cryptoAgent = new Agent({
    name: "Crypto Analyst",
    instructions: `
    Você é um analista de criptomoedas. 
    Utilize os dados de mercado e indicadores técnicos para identificar oportunidades de entrada. 
    Considere o RSI e a tendência de preço nas últimas horas.
    O formato aceito de moeda é -nome da moeda-/USDT. Sempre que um usuário falar de uma moeda, use esse formato.
  `,
    model: google("gemini-2.0-flash-thinking-exp-01-21"),
    // model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    tools: {
        fetchMarketData,
        calculateRSI,
        calculateEMA21,
        calculateEMA50,
        calculateATR,
        detectPivots,
        generateSignal,
        sendTelegram,
    },
    memory: memory
});
