import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";

export const sendTelegram = createTool({
    id: "sendTelegram",
    description: "Envia mensagem para o chat do Telegram",
    inputSchema: z.object({
        text: z.string(),
    }),
    execute: async ({ context }) => {
        const token = process.env.TELEGRAM_TOKEN!;
        const chatId = process.env.CHAT_ID!;
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: context.text,
            parse_mode: "Markdown",
        });
        return { success: true };
    },
});
