import { Mastra } from "@mastra/core";
import { ConsoleLogger } from "@mastra/core/logger";
import { cryptoAgent } from "./agents/crypto-agent";
import { LibSQLStore } from "@mastra/libsql";
import { getMarketAnalysisWorkflow } from "./workflow";
import { workflowCryptoAgent } from "./agents/workflow-crypt-agent";
export const mastra = new Mastra({
    logger: new ConsoleLogger({
        name: "MastraApp",
        level: "info",
    }),
    agents: {
        cryptoAgent,
        workflowCryptoAgent
    },
    workflows: {
        getMarketAnalysisWorkflow
    },
    storage: new LibSQLStore({
        url: "file:../mastra.db",
    }),
})