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
import { detectPivotsEnhanced } from "../tools/detect-pivot-points";
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
        lastMessages: 10,
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
    Você é um analista experiente e especializado no mercado de perpetuals. 

    Você consegue utilizar a tool sendTelegram para enviar mensagens ao usuário sempre que for solicitado.

  `,
    model: google("gemini-2.0-flash-001"),
    // model: groq("deepseek-r1-distill-qwen-32b"),
    tools: {
        sendTelegram,
    },
    memory: memory
});
