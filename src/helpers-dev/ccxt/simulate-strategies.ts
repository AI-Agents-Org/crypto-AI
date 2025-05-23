import * as ccxt from 'ccxt';
import { sma, rsi } from 'technicalindicators';
import QuickChart from 'quickchart-js';
import dotenv from 'dotenv';

dotenv.config();

const exchange = new ccxt.bybit({
    enableRateLimit: true,
    options: { defaultType: 'future' },
    apiKey: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
});

// Estratégias: Seguir Tendência Adaptativa (SMA) + Pullback (RSI)
async function fetchOhlcv(symbol: string, timeframe = '1h', limit = 200) {
    try {
        return await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
    } catch (e) {
        return [];
    }
}

function simulateStrategies(ohlcv: (number | undefined)[][]) {
    // Filtra candles inválidos
    const validOhlcv = ohlcv.filter(c => c.length >= 5 && c.every(v => typeof v === 'number' && isFinite(v)));
    const closes = validOhlcv.map((c) => c[4] as number);
    const times = validOhlcv.map((c) => c[0] as number);
    // SMA rápida e lenta
    const smaFast = sma({ period: 9, values: closes });
    const smaSlow = sma({ period: 21, values: closes });
    // RSI
    const rsiVals = rsi({ period: 14, values: closes });

    let position: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let pnl = 0;
    const signals: { idx: number; type: 'buy' | 'sell'; price: number }[] = [];
    const equity: number[] = [];
    let lastSignalIdx = 0;

    for (let i = 21; i < closes.length; i++) {
        // Estratégia 1: Cruzamento de SMA (tendência)
        const prevFast = smaFast[i - 22];
        const prevSlow = smaSlow[i - 22];
        const currFast = smaFast[i - 21];
        const currSlow = smaSlow[i - 21];
        // Estratégia 2: Pullback (RSI)
        const currRsi = rsiVals[i - 21 - (14 - 1)];

        // Sinal de compra: cruzamento para cima + RSI pullback
        if (
            position !== 'long' &&
            prevFast < prevSlow &&
            currFast > currSlow &&
            currRsi < 40
        ) {
            position = 'long';
            entryPrice = closes[i];
            signals.push({ idx: i, type: 'buy', price: closes[i] });
            lastSignalIdx = i;
        }
        // Sinal de venda: cruzamento para baixo + RSI sobrecompra
        else if (
            position === 'long' &&
            prevFast > prevSlow &&
            currFast < currSlow &&
            currRsi > 60
        ) {
            pnl += closes[i] - entryPrice;
            position = null;
            signals.push({ idx: i, type: 'sell', price: closes[i] });
            lastSignalIdx = i;
        }
        equity.push(pnl + (position === 'long' ? closes[i] - entryPrice : 0));
    }
    return { signals, equity, closes, times };
}

async function main() {
    const symbol = 'TAI/USDT:USDT';
    const ohlcv = await fetchOhlcv(symbol, '1h', 50);
    if (!ohlcv.length) {
        console.error('Sem dados OHLCV para', symbol);
        return;
    }
    const { signals, equity, closes, times } = simulateStrategies(ohlcv);

    // Gráfico com QuickChart
    const chart = new QuickChart();
    chart.setConfig({
        type: 'line',
        data: {
            labels: times.map((t) => new Date(t).toISOString().slice(5, 16)),
            datasets: [
                {
                    label: 'Preço',
                    data: closes,
                    borderColor: 'gray',
                    fill: false,
                },
                {
                    label: 'Equity',
                    data: equity,
                    borderColor: 'blue',
                    fill: false,
                    yAxisID: 'y1',
                },
                {
                    type: 'scatter',
                    label: 'Entradas',
                    data: signals
                        .filter((s) => s.type === 'buy')
                        .map((s) => ({ x: s.idx, y: s.price })),
                    pointBackgroundColor: 'green',
                    pointRadius: 6,
                    showLine: false,
                },
                {
                    type: 'scatter',
                    label: 'Saídas',
                    data: signals
                        .filter((s) => s.type === 'sell')
                        .map((s) => ({ x: s.idx, y: s.price })),
                    pointBackgroundColor: 'red',
                    pointRadius: 6,
                    showLine: false,
                },
            ],
        },
        options: {
            scales: {
                y: { type: 'linear', position: 'left', title: { display: true, text: 'Preço' } },
                y1: { type: 'linear', position: 'right', title: { display: true, text: 'Equity' }, grid: { drawOnChartArea: false } },
            },
            plugins: {
                title: { display: true, text: 'Simulação: Tendência Adaptativa + Pullback (TAI/USDT)' },
                legend: { display: true },
            },
        },
    });
    chart.setWidth(1200).setHeight(600);
    const url = await chart.getShortUrl();
    console.log('Veja o gráfico da simulação neste link curto:', url);
    // Salvar imagem localmente
    const fs = await import('fs');
    const axios = (await import('axios')).default;
    const imageResp = await axios.get(chart.getUrl(), { responseType: 'arraybuffer' });
    fs.writeFileSync(__dirname + '/simulacao-tai-usdt.png', imageResp.data);
    console.log('A imagem do gráfico foi salva em src/ccxt/simulacao-tai-usdt.png. Abra o arquivo para visualizar localmente.');
}

main(); 