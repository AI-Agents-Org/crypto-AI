import ccxt from "ccxt";
import dotenv from "dotenv";
import moment from "moment";
import { EMA, ATR } from "technicalindicators";

dotenv.config();

type Candle = { timestamp: number; open: number; high: number; low: number; close: number; volume: number };

// Lista de símbolos prioritários para investirmos
const symbols = [
    "ETHUSDT",
    // "MATICUSDT",
    "FILUSDT",
    "AVAXUSDT",
    "SEIUSDT",
    // "FTMUSDT",
    "SUIUSDT",
    "DYDXUSDT",
    "MKRUSDT"
];

// Configuração da exchange Bybit
const exchange = new ccxt.bybit({
    enableRateLimit: true,
    options: { defaultType: 'future' },
    apiKey: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
});

const timeframe = '1h';
const limit = 100; // número de candles a buscar por par

// Parâmetros de estratégia
const periodoPivots = 2;
const periodoATR = 14;
const toleranciaATR = 1.5;
const periodoVolume = 10;
const filtroEMA = 100;
const slPct = 0.02;
const tpPct = 0.03;

// Busca dados OHLCV de forma confiável via ccxt
async function fetchCandles(symbol: string, timeframe: string, limit: number): Promise<Candle[]> {
    try {
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
        return ohlcv.map(c => ({
            timestamp: Number(c[0]),
            open: Number(c[1]),
            high: Number(c[2]),
            low: Number(c[3]),
            close: Number(c[4]),
            volume: Number(c[5])
        }));
    } catch (e) {
        console.warn(`Erro ao buscar ${symbol}:`, e);
        return [];
    }
}

function detectPivots(candles: Candle[], left = periodoPivots, right = periodoPivots) {
    const highs: number[] = [], lows: number[] = [];
    for (let i = left; i < candles.length - right; i++) {
        const window = candles.slice(i - left, i + right + 1);
        if (window.every(c => candles[i].high >= c.high)) highs.push(i);
        if (window.every(c => candles[i].low <= c.low)) lows.push(i);
    }
    return { highs, lows };
}

async function analyzeSymbol(symbol: string, timeframe: string = '1h', limit: number = 100) {
    const candles = await fetchCandles(symbol, timeframe, limit);

    if (!candles || candles.length === 0) {
        console.log(`[${symbol}] Sem candles retornados ou array vazio.`);
        // The existing insufficient data check will also catch this, but this is more direct for empty array
    } else {
        console.log('candles', candles[candles.length - 1]);
        console.log('data do ultimo candle', moment(candles[candles.length - 1].timestamp).format('YYYY-MM-DD HH:mm:ss'));
        console.log('data do primeiro candle', moment(candles[0].timestamp).format('YYYY-MM-DD HH:mm:ss'));
    }

    if (candles.length < Math.max(periodoPivots * 2 + 1, periodoATR, filtroEMA, periodoVolume)) {
        console.log(`[${symbol}] Dados insuficientes`);
        return;
    }

    // indicadores
    const closes = candles.map(c => c.close);
    const highsArr = candles.map(c => c.high);
    const lowsArr = candles.map(c => c.low);
    const vols = candles.map(c => c.volume);

    const atrValues = ATR.calculate({ period: periodoATR, high: highsArr, low: lowsArr, close: closes });
    const ema100 = EMA.calculate({ period: filtroEMA, values: closes });

    const { highs, lows } = detectPivots(candles);
    const lastIndex = candles.length - 1;
    const price = closes[lastIndex];
    const currentATR = atrValues[atrValues.length - 1];
    const trendEMA = ema100[ema100.length - 1];
    const recentVol = vols.slice(-periodoVolume);
    const avgVol = recentVol.reduce((a, b) => a + b, 0) / recentVol.length;

    const tol = currentATR * toleranciaATR;
    const isUp = price > trendEMA;
    const isDown = price < trendEMA;

    // últimos 3 pivôs
    const lastH = highs.filter(i => i < lastIndex).slice(-3);
    const lastL = lows.filter(i => i < lastIndex).slice(-3);

    // sinal Long
    if (lastH.length === 3 && isUp) {
        const vals = lastH.map(i => highsArr[i]);
        const maxH = Math.max(...vals), minH = Math.min(...vals);
        if (maxH - minH <= tol && price > maxH && candles[lastIndex].volume > avgVol) {
            const entry = price;
            const stop = entry * (1 - slPct);
            const tp = entry * (1 + tpPct);
            console.log(`[${symbol}] LONG -> Entry: ${entry.toFixed(4)}, Stop: ${stop.toFixed(4)}, TP: ${tp.toFixed(4)}`);
            return;
        }
    }

    // sinal Short
    if (lastL.length === 3 && isDown) {
        const vals = lastL.map(i => lowsArr[i]);
        const maxL = Math.max(...vals), minL = Math.min(...vals);
        if (maxL - minL <= tol && price < minL && candles[lastIndex].volume > avgVol) {
            const entry = price;
            const stop = entry * (1 + slPct);
            const tp = entry * (1 - tpPct);
            console.log(`[${symbol}] SHORT -> Entry: ${entry.toFixed(4)}, Stop: ${stop.toFixed(4)}, TP: ${tp.toFixed(4)}`);
            return;
        }
    }

    console.log(`[${symbol}] Sem sinal no momento`);
}

(async () => {
    for (const sym of symbols) {
        await analyzeSymbol(sym);
    }
})();
