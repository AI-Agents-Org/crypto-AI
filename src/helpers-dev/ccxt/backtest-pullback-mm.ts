import axios from "axios";
import { EMA, RSI } from "technicalindicators";
import * as fs from "fs";
import moment from "moment";

const capitalInicial = 1000;
const par = "FILUSDT";
const inicio = "2024-01-01";
const fim = "2025-05-19";

async function fetchCandles(): Promise<any[]> {
    const response = await axios.get("https://api.bybit.com/v5/market/kline", {
        params: {
            category: "linear",
            symbol: par,
            interval: "D",
            start: new Date(inicio).getTime(),
            end: new Date(fim).getTime(),
            limit: 1000,
        },
    });

    return response.data.result.list.map((candle: any) => ({
        timestamp: parseInt(candle[0]),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
    }));
}

async function runBacktest() {
    const candles = await fetchCandles();
    const closes = candles.map(c => c.close);

    const ema29 = EMA.calculate({ period: 29, values: closes });
    const ema9 = EMA.calculate({ period: 9, values: closes });
    const ema21 = EMA.calculate({ period: 21, values: closes });
    const rsi3 = RSI.calculate({ period: 3, values: closes });
    const rsi7 = RSI.calculate({ period: 7, values: closes });

    let capital = capitalInicial;
    let position: { entry: number; index: number } | null = null;
    let peakCapital = capital;
    let maxDrawdown = 0;
    let trades = 0;

    const buySignals: number[] = [];
    const sellSignals: number[] = [];

    for (let i = 29; i < closes.length; i++) {
        const close = closes[i];
        const emaTrend = ema29[i - 29];
        const rsiShort = rsi3[i - 29];
        const rsiLong = rsi7[i - 29];

        if (!emaTrend || !rsiShort || !rsiLong) continue;

        const candlePrev = candles[i - 1];
        const candleAtual = candles[i];
        const fechamentoAcimaAnterior = candleAtual.close > candlePrev.close;

        const emTendenciaAlta = close > emaTrend;
        const emPullback = rsiShort < 40;

        if (!position) {
            if (emTendenciaAlta && emPullback && fechamentoAcimaAnterior) {
                position = { entry: close, index: i };
                buySignals.push(i);
                trades++;
                console.log(`[BUY] ${moment(candleAtual.timestamp).format("YYYY-MM-DD")} @ ${close}`);
            }
        } else {
            const change = ((close - position.entry) / position.entry) * 100;
            const stopLoss = change <= -10;
            const sobrecompra = rsiLong > 70;
            const perdeuTendencia = close < emaTrend;

            if (sobrecompra || stopLoss || perdeuTendencia) {
                capital *= 1 + change / 100;
                sellSignals.push(i);
                console.log(`[SELL] ${moment(candleAtual.timestamp).format("YYYY-MM-DD")} @ ${close} | Δ: ${change.toFixed(2)}%`);
                position = null;

                if (capital > peakCapital) peakCapital = capital;
                const drawdown = ((peakCapital - capital) / peakCapital) * 100;
                if (drawdown > maxDrawdown) maxDrawdown = drawdown;
            }
        }
    }


    console.log(`\n=== RESULTADOS ===`);
    console.log(`Capital final: $${capital.toFixed(2)}`);
    console.log(`Ordens executadas: ${trades}`);
    console.log(`Max Drawdown: ${maxDrawdown.toFixed(2)}%`);

    fs.writeFileSync("backtest.json", JSON.stringify({
        candles, ema29, ema9, ema21, rsi3, rsi7, buySignals, sellSignals
    }));
}

runBacktest();
