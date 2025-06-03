import express, { Request, Response } from 'express';
import cors from 'cors';
import { mastra } from './mastra';
import { z } from 'zod';
import dotenv from 'dotenv';
import { cryptoAgent } from './mastra/agents/crypto-agent';
import { Memory } from '@mastra/memory';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['GOOGLE_GENERATIVE_AI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    console.error('Please set these variables in your .env file');
    process.exit(1);
}

// Schema de validação para a requisição
const marketAnalysisSchema = z.object({
    symbol: z.string().min(1),
    timeframe: z.string().min(1),
    limit: z.number().optional().default(100)
});

const chatMessageSchema = z.object({
    message: z.string().min(1),
    threadId: z.string().optional()
});

interface MarketAnalysisRequest {
    symbol: string;
    timeframe: string;
    limit?: number;
}

interface ChatMessageRequest {
    message: string;
    threadId?: string;
}

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Middleware de erro
const errorHandler = (err: Error, req: Request, res: Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
};

// Rota para chat com o agente
app.post('/api/chat', async (req: Request<{}, {}, ChatMessageRequest>, res: Response) => {
    try {
        // Validação dos dados de entrada
        const validatedData = chatMessageSchema.parse(req.body);
        const { message, threadId } = validatedData;

        // Obter ou criar thread
        const memory = cryptoAgent.getMemory();
        if (!memory) {
            return res.status(500).json({ error: 'Memory system not initialized' });
        }

        let thread;
        const resourceId = 'chat-' + (threadId || Date.now().toString());

        if (threadId) {
            thread = await memory.getThreadById({ threadId });
            if (!thread) {
                return res.status(404).json({ error: 'Thread not found' });
            }
        } else {
            thread = await memory.createThread({
                resourceId,
                title: 'New Conversation',
                metadata: { type: 'chat' }
            });
        }

        // Salvar mensagem do usuário
        await memory.saveMessages({
            messages: [{
                role: 'user',
                content: message,
                threadId: thread.id,
                resourceId,
                type: 'text',
                id: Date.now().toString(),
                createdAt: new Date()
            }],
            memoryConfig: {}
        });

        // Buscar histórico da thread
        const history = await memory.rememberMessages({ threadId: thread.id });
        const messages = history.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content
        }));
        // Adicionar a mensagem atual do usuário ao final (caso não esteja no histórico ainda)
        if (!messages.length || messages[messages.length - 1].content !== message) {
            messages.push({ role: 'user', content: message });
        }

        // Gerar resposta do agente usando o histórico
        const response = await cryptoAgent.generate(messages, {
            runId: thread.id
        });

        // Salvar resposta do agente
        await memory.saveMessages({
            messages: [{
                role: 'assistant',
                content: response.text,
                threadId: thread.id,
                resourceId,
                type: 'text',
                id: (Date.now() + 1).toString(),
                createdAt: new Date()
            }],
            memoryConfig: {}
        });

        res.json({
            threadId: thread.id,
            response: response.text,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request data',
                details: error.errors
            });
        }
        console.error('Error in chat:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Rota para executar o workflow de análise de mercado
app.post('/api/market-analysis', async (req: Request<{}, {}, MarketAnalysisRequest>, res: Response) => {
    try {
        // Validação dos dados de entrada
        const validatedData = marketAnalysisSchema.parse(req.body);
        const { symbol, timeframe, limit } = validatedData;

        const workflow = mastra.getWorkflow('getMarketAnalysisWorkflow');
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        const run = workflow.createRun();
        const result = await run.start({
            inputData: {
                symbol,
                timeframe,
                limit
            }
        });

        res.json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request data',
                details: error.errors
            });
        }
        console.error('Error executing workflow:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Rota de health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        environment: {
            hasGoogleApiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
            hasBYBITApiKey: !!process.env.BYBIT_API_KEY,
            hasBYBITApiSecret: !!process.env.BYBIT_API_SECRET
        }
    });
});

// Aplicar middleware de erro
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 