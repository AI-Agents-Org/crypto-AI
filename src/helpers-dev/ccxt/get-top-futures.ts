import * as ccxt from 'ccxt';
import dotenv from 'dotenv';

dotenv.config();

// Configuração da exchange (Bybit, futuros)
const exchange = new ccxt.bybit({
    enableRateLimit: true,
    options: { defaultType: 'perpetual' },
    apiKey: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
});

// Busca todos os mercados de futuros USDT
async function fetchUsdtFuturesPairs(): Promise<string[]> {
    await exchange.loadMarkets();
    return Object.keys(exchange.markets).filter(
        (symbol) => symbol.endsWith(':USDT')
    );
}

// Busca dados OHLCV para um par
async function fetchOhlcv(symbol: string, timeframe = '1h', limit = 100): Promise<(number | undefined)[][]> {
    try {
        return await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
    } catch (e) {
        // Pode acontecer de alguns mercados não terem dados suficientes
        return [];
    }
}

// Calcula a variação percentual do preço de fechamento
function calcPctChange(ohlcv: (number | undefined)[][]): number | null {
    if (!ohlcv || ohlcv.length < 2) return null;
    const firstClose = ohlcv[0][4];
    const lastClose = ohlcv[ohlcv.length - 1][4];
    if (
        typeof firstClose !== 'number' ||
        typeof lastClose !== 'number' ||
        !isFinite(firstClose) ||
        !isFinite(lastClose) ||
        firstClose === 0
    ) {
        return null;
    }
    return ((lastClose - firstClose) / firstClose) * 100;
}

export async function getTopFutures(): Promise<string[]> {
    console.log(`[${new Date().toISOString()}] Buscando mercados de futuros USDT na Bybit...`);
    const pairs = await fetchUsdtFuturesPairs();
    console.log(`Total de pares encontrados: ${pairs.length}`);

    const results: { symbol: string; pct: number }[] = [];

    for (const symbol of pairs) {
        const ohlcv = await fetchOhlcv(symbol, '1h', 24);
        const pct = calcPctChange(ohlcv);
        if (pct !== null && isFinite(pct)) {
            results.push({ symbol, pct });
        }
    }

    // Ordena por variação percentual decrescente
    results.sort((a, b) => b.pct - a.pct);
    const top10 = results.slice(0, 10);

    const top10negativo = results.slice(-10).sort((a, b) => b.pct - a.pct);
    // console.table(
    //     top10.map((item, idx) => ({
    //         Rank: idx + 1,
    //         Par: item.symbol,
    //         'Variação (%)': item.pct.toFixed(2),
    //     }))
    // );
    // console.table(
    //     top10negativo.map((item, idx) => ({
    //         Rank: idx + 1,
    //         Par: item.symbol,
    //         'Variação (%)': item.pct.toFixed(2),
    //     }))
    // );

    const symbols = [...top10.map((item) => item.symbol), ...top10negativo.map((item) => item.symbol)];

    return symbols;
}

// (async () => {
//     try {
//         const topFutures = await getTopFutures();
//         console.log('Top 10 futures:', topFutures);
//     } catch (err) {
//         console.error('Erro:', err);
//         process.exit(1);
//     }
// })();
