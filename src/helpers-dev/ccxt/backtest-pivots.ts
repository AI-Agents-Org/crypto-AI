import axios from "axios";
import * as fs from "fs";
import moment from "moment";
import { EMA, ATR } from "technicalindicators";

type Candle = { timestamp: number; open: number; high: number; low: number; close: number; volume: number };

const capitalInicial = 1000;
const par = "MATICUSDT";
const intervalo = "1h";
const inicio = "2024-01-01";
const fim = "2025-05-20";

// Parâmetros de estratégia
const periodoPivots = 2;
const toleranciaATR = 1.5; // ATR múltiplo para range de pivôs
const periodoATR = 14;
const periodoVolume = 10;
const filtroEMA = 100; // EMA para filtro de tendência
const slPct = 0.03;
const tpPct = 0.06;
const halfPct = 0.03;

async function fetchCandles(): Promise<Candle[]> {
    const resp = await axios.get("https://api.bybit.com/v5/market/kline", {
        params: {
            category: "linear",
            symbol: par,
            interval: intervalo,
            start: new Date(inicio).getTime(),
            end: new Date(fim).getTime(),
            limit: 1000
        }
    });
    return resp.data.result.list.map((c: any) => ({
        timestamp: +c[0],
        open: +c[1],
        high: +c[2],
        low: +c[3],
        close: +c[4],
        volume: +c[5]
    }));
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

async function runBacktest() {
    const candles = await fetchCandles();
    const { highs, lows } = detectPivots(candles);

    // Calcular ATR e EMA100 e média de volume
    const atrValues = ATR.calculate({ period: periodoATR, high: candles.map(c => c.high), low: candles.map(c => c.low), close: candles.map(c => c.close) });
    const ema100 = EMA.calculate({ period: filtroEMA, values: candles.map(c => c.close) });

    let capital = capitalInicial;
    let position: { side: 'long' | 'short'; entry: number; size: number; stop: number; tp: number; halfClosed: boolean } | null = null;
    let peak = capital;
    let maxDD = 0;
    let trades = 0;
    const buySignals: number[] = [], sellSignals: number[] = [];

    for (let i = Math.max(periodoATR, filtroEMA); i < candles.length; i++) {
        const price = candles[i].close;
        const currentATR = atrValues[i - periodoATR] || atrValues[0];
        const trendEMA = ema100[i - filtroEMA] || ema100[0];
        const lastHighs = highs.filter(idx => idx < i).slice(-3);
        const lastLows = lows.filter(idx => idx < i).slice(-3);

        // Média de volume recente
        const recentVolumes = candles.slice(i - periodoVolume, i).map(c => c.volume);
        const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

        // Tolerância adaptada ao ATR
        const tol = currentATR * toleranciaATR;

        // FILTRO MACRO DE TENDÊNCIA
        const isUpTrend = price > trendEMA;
        const isDownTrend = price < trendEMA;

        if (!position && lastHighs.length === 3 && isUpTrend) {
            const uvals = lastHighs.map(idx => candles[idx].high);
            const maxHigh = Math.max(...uvals);
            const minHigh = Math.min(...uvals);
            if (maxHigh - minHigh <= tol && candles[i].close > maxHigh && candles[i].volume > avgVolume) {
                // Long entry imediata no breakout
                const entry = price;
                position = { side: 'long', entry, size: capital / entry, stop: entry * (1 - slPct), tp: entry * (1 + tpPct), halfClosed: false };
                buySignals.push(i); trades++;
                console.log(`[LONG] ${moment(candles[i].timestamp).format('YYYY-MM-DD')} @ ${entry.toFixed(4)}`);
            }
        }

        if (!position && lastLows.length === 3 && isDownTrend) {
            const lvals = lastLows.map(idx => candles[idx].low);
            const maxLow = Math.max(...lvals);
            const minLow = Math.min(...lvals);
            if (maxLow - minLow <= tol && candles[i].close < minLow && candles[i].volume > avgVolume) {
                // Short entry
                const entry = price;
                position = { side: 'short', entry, size: capital / entry, stop: entry * (1 + slPct), tp: entry * (1 - tpPct), halfClosed: false };
                sellSignals.push(i); trades++;
                console.log(`[SHORT] ${moment(candles[i].timestamp).format('YYYY-MM-DD')} @ ${entry.toFixed(4)}`);
            }
        }

        if (position) {
            const pnlPct = position.side === 'long' ? (price - position.entry) / position.entry : (position.entry - price) / position.entry;
            // fechamento parcial
            if (!position.halfClosed && pnlPct >= halfPct) {
                const profit = (position.side === 'long' ? price - position.entry : position.entry - price) * (position.size / 2);
                capital += profit;
                position.size /= 2;
                position.stop = position.entry;
                position.halfClosed = true;
                console.log(`[HALF CLOSE] ${moment(candles[i].timestamp).format('YYYY-MM-DD')} @ ${price.toFixed(4)}`);
            }
            // saída final
            if (pnlPct <= -slPct || pnlPct >= tpPct || price <= position.stop || price >= position.tp) {
                const profit = (position.side === 'long' ? price - position.entry : position.entry - price) * position.size;
                capital += profit;
                sellSignals.push(i);
                console.log(`[EXIT] ${moment(candles[i].timestamp).format('YYYY-MM-DD')} @ ${price.toFixed(4)} | PnL%: ${(pnlPct * 100).toFixed(2)}%`);
                position = null;
            }
            peak = Math.max(peak, capital);
            maxDD = Math.max(maxDD, (peak - capital) / peak);
        }
    }

    console.log(`\n=== RESULTADOS ===`);
    console.log(`Capital final: $${capital.toFixed(2)}`);
    console.log(`Trades: ${trades}`);
    console.log(`Max Drawdown: ${(maxDD * 100).toFixed(2)}%`);
    fs.writeFileSync('backtest_pivots.json', JSON.stringify({ candles, buySignals, sellSignals }));
}

runBacktest();
