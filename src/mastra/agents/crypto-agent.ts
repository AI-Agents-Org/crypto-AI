import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { fastembed } from "@mastra/fastembed";
import { fetchMarketData } from "../tools/fetch-market-data";

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
    Sua capacidade de analisar os dados históricos e atuais do mercado de perpetuals é essencial para fornecer recomendações de negociação precisas.
    Acompanhar padrões de preço, volumes e outros indicadores técnicos disponibilizados é fundamental para identificar oportunidades de negociação.
  `,
    model: google("gemini-2.0-flash-thinking-exp-01-21"),
    tools: { fetchMarketData },
    memory: memory
});
