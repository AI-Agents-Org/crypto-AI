import {
    Chart,
    registerables,
    ChartConfiguration,
    ChartDataset,
    Point,
    ScatterDataPoint,
} from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import * as fs from 'fs';
import moment from 'moment';

Chart.register(...registerables);
const whiteBackgroundPlugin = {
    id: 'customCanvasBackgroundColor',
    beforeDraw: (chart: Chart) => {
        const ctx = chart.canvas.getContext('2d');
        if (ctx) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#ffffff'; // fundo branco
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
    }
};

const width = 1200;
const height = 800;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

type Candle = { timestamp: number; close: number };

interface BacktestData {
    candles: Candle[];
    ema29: number[];
    rsi3: number[];
    rsi7: number[];
    buySignals: number[];
    sellSignals: number[];
}

const drawChart = async () => {
    const data: BacktestData = JSON.parse(fs.readFileSync('backtest.json', 'utf-8'));

    const labels = data.candles.map(c => moment(c.timestamp).format('YYYY-MM-DD'));
    const closePrices = data.candles.map(c => c.close);

    const buyPoints = data.buySignals.map(i => ({
        x: labels[i],
        y: closePrices[i],
    }));

    const sellPoints = data.sellSignals.map(i => ({
        x: labels[i],
        y: closePrices[i],
    }));

    const configuration: ChartConfiguration<'line' | 'scatter'> = {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Preço de Fechamento',
                    data: closePrices,
                    borderColor: 'black',
                    borderWidth: 1,
                    pointRadius: 0,
                },
                // ...
                {
                    type: 'scatter',
                    label: 'Buy',
                    data: buyPoints as unknown as Point[],
                    showLine: false,
                    pointStyle: 'triangle',
                    pointRadius: 8,
                    pointBackgroundColor: 'green',
                },
                {
                    type: 'scatter',
                    label: 'Sell',
                    data: sellPoints as unknown as Point[],
                    showLine: false,
                    pointStyle: 'triangle',
                    pointRadius: 8,
                    pointRotation: 180,
                    pointBackgroundColor: 'red',
                },
            ],
        },
        options: {
            scales: {
                y: { position: 'left', title: { display: true, text: 'Preço (USDT)' } },
                y1: {
                    position: 'right',
                    title: { display: true, text: 'RSI' },
                    grid: { drawOnChartArea: false },
                    min: 0,
                    max: 100,
                },
            },
            plugins: {
                legend: { position: 'bottom' },
                title: {
                    display: true,
                    text: 'Backtest',
                    font: { size: 18 },
                },
            },
        },
        plugins: [whiteBackgroundPlugin],
    };

    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    fs.writeFileSync('grafico-backtest.png', imageBuffer);
};

drawChart();
