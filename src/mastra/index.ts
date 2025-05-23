import { Mastra } from "@mastra/core";
import { createLogger } from "@mastra/core/logger";
import { cryptoAgent } from "./agents/crypto-agent";
import { LibSQLStore } from "@mastra/libsql";
import { getEMAWorkflow } from "./workflow";
export const mastra = new Mastra({
    logger: createLogger({
        name: "MastraApp",
        level: "info",
    }),
    agents: {
        cryptoAgent
    },
    workflows: {
        getEMAWorkflow
    },
})