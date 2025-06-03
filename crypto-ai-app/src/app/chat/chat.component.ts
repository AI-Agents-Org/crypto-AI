import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChatService, ChatMessage } from '../core/services/chat.service';
import { marked } from 'marked';

interface ChatMessageWithHtml extends ChatMessage {
    html?: string;
}

function parseMarkdownSync(md: string): string {
    // marked.parse pode retornar Promise<string> em algumas versões, então forçamos string
    const result = marked.parse(md);
    if (typeof result === 'string') return result;
    // fallback para string vazia se não for string
    return '';
}

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit {
    messages: ChatMessageWithHtml[] = [];
    currentMessage: string = '';
    threadId?: string;
    isLoading: boolean = false;

    constructor(private chatService: ChatService) { }

    ngOnInit(): void {
        // Add initial greeting message
        this.messages.push({
            role: 'assistant',
            content: 'Olá! Sou seu assistente de análise de criptomoedas. Como posso ajudar você hoje?',
            timestamp: new Date().toISOString(),
            html: parseMarkdownSync('Olá! Sou seu assistente de análise de criptomoedas. Como posso ajudar você hoje?')
        });
    }

    sendMessage(): void {
        if (!this.currentMessage.trim()) return;

        // Add user message to chat
        const userMessage: ChatMessageWithHtml = {
            role: 'user',
            content: this.currentMessage,
            timestamp: new Date().toISOString()
        };
        this.messages.push(userMessage);

        // Clear input
        const messageToSend = this.currentMessage;
        this.currentMessage = '';
        this.isLoading = true;

        this.chatService.sendMessage(messageToSend, this.threadId).subscribe({
            next: (response) => {
                if (!this.threadId) {
                    this.threadId = response.threadId;
                }
                // Add assistant response to chat, convert markdown to HTML
                this.messages.push({
                    role: 'assistant',
                    content: response.response,
                    timestamp: response.timestamp,
                    html: parseMarkdownSync(response.response)
                });
                this.isLoading = false;
            },
            error: (error) => {
                this.messages.push({
                    role: 'assistant',
                    content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
                    timestamp: new Date().toISOString(),
                    html: parseMarkdownSync('Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.')
                });
                this.isLoading = false;
            }
        });
    }
} 