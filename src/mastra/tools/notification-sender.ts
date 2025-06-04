import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";
import { environment } from "../../../crypto-ai-app/src/environments/environment";
import telegramifyMarkdown from 'telegramify-markdown';

async function sendTelegramMessage(message: string) {
    try {
        const token = environment.telegram.token;
        const chatId = environment.telegram.chatId;
        const maxLength = 4000;

        // Format the message for Telegram using telegramify-markdown
        const messageFormatted = telegramifyMarkdown(message, 'escape')
            // Remove HTML tags
            .replace(/<[^>]*>/g, '')
            // Remove HTML entities
            .replace(/&[^;]+;/g, '')
            // Add signature
            + '\n\n✅ Envio automático via Inteligência Artificial de trading';

        // Validate length
        if (messageFormatted.length > maxLength * 10) {
            throw new Error('Mensagem muito longa para processamento');
        }

        // Split message into chunks with delay between sends
        const chunks = [];
        for (let i = 0; i < messageFormatted.length; i += maxLength) {
            chunks.push(messageFormatted.substring(i, i + maxLength));
        }

        // Send chunks with delay to avoid overload
        for (const chunk of chunks) {
            try {
                await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                    chat_id: chatId,
                    text: chunk,
                    parse_mode: "MarkdownV2"
                });
                // Wait 500ms between each send
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error('Erro ao enviar parte da mensagem:', error);
                // Continue sending next parts even if one fails
                continue;
            }
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
    }
}

export const sendTelegram = createTool({
    id: "sendTelegram",
    description: "Envia mensagem para o chat do Telegram",
    inputSchema: z.object({ message: z.string() }),
    outputSchema: z.object({ success: z.boolean() }),
    execute: async ({ context }) => {
        const messageText = context.message;

        console.log('enviando mensagem para o telegram...')
        await sendTelegramMessage(messageText);

        return { success: true };
    },
});
