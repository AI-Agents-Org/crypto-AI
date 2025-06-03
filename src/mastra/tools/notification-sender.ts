import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";
import { environment } from "../../../crypto-ai-app/src/environments/environment";

async function sendTelegramMessage(message: string) {
    try {
        const token = environment.telegram.token;
        const chatId = environment.telegram.chatId;
        const maxLength = 4000;

        // Limpa e formata a mensagem
        const messageFormatted = message
            .replace(/```html/g, '')
            .replace(/```/g, '')
            .replace(/<[^>]*>/g, '')
            .replace(/&[^;]+;/g, '')
            + '\n\n✅ Envio automático via Inteligência Artificial de trading';

        // Valida o tamanho
        if (messageFormatted.length > maxLength * 10) {
            throw new Error('Mensagem muito longa para processamento');
        }

        // Divide a mensagem em chunks com delay entre cada envio
        const chunks = [];
        for (let i = 0; i < messageFormatted.length; i += maxLength) {
            chunks.push(messageFormatted.substring(i, i + maxLength));
        }

        // Envia chunks com delay para evitar sobrecarga
        for (const chunk of chunks) {
            try {
                await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                    chat_id: chatId,
                    text: chunk,
                    parse_mode: "HTML"
                });
                // Aguarda 500ms entre cada envio
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error('Erro ao enviar parte da mensagem:', error);
                // Continua enviando as próximas partes mesmo se uma falhar
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
