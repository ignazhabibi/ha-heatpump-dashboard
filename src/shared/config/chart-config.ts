import { ChartOptions } from 'chart.js/auto';

export interface ChartConfigOptions {
    type: 'line' | 'bar';
    stacked?: boolean;
    hasSecondaryAxis?: boolean;
    symbol?: string; // e.g. "°" or "kWh"
    xAxisTitle?: string;
    yAxisTitle?: string;
    y1AxisTitle?: string;
    yMin?: number;
    yMax?: number;
    beginAtZero?: boolean;
    fontColor?: string;
    gridColor?: string;
    darkMode?: boolean;
}

export class ChartConfigFactory {
    public static createOptions(config: ChartConfigOptions): ChartOptions {
        const {
            stacked = false,
            hasSecondaryAxis = false,
            symbol = "",
            xAxisTitle,
            yAxisTitle,
            y1AxisTitle,
            yMin,
            yMax,
            beginAtZero = true,
            fontColor = '#999',
            gridColor = '#e0e0e0',
            darkMode = false
        } = config;
        const resolvedYAxisTitle = yAxisTitle ?? symbol;

        const options: ChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: darkMode ? '#fff' : '#000',
                    bodyColor: darkMode ? '#fff' : '#000',
                    borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => {
                            const dataset = context.dataset as { label?: string; unit?: string };
                            let label = dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                const value = context.parsed.y;
                                const formattedValue = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
                                const unit = dataset.unit !== undefined ? dataset.unit : symbol;
                                label += formattedValue + (unit ? ' ' + unit : '');
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    title: {
                        display: Boolean(xAxisTitle),
                        text: xAxisTitle || '',
                        color: fontColor
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8,
                        color: fontColor,
                        font: { size: 10 }
                    },
                    stacked: stacked
                },
                y: {
                    beginAtZero: beginAtZero,
                    position: 'left',
                    title: {
                        display: Boolean(resolvedYAxisTitle),
                        text: resolvedYAxisTitle || '',
                        color: fontColor
                    },
                    grid: { color: gridColor },
                    ticks: {
                        color: fontColor,
                        font: { size: 10 }
                    },
                    border: { display: false },
                    stacked: stacked,
                    min: yMin,
                    max: yMax
                }
            }
        };

        if (hasSecondaryAxis) {
            options.scales!['y1'] = {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                grid: { display: false },
                    border: { display: false },
                    title: {
                        display: Boolean(y1AxisTitle),
                        text: y1AxisTitle || '',
                        color: fontColor
                    },
                    ticks: {
                        color: fontColor,
                        font: { size: 10 }
                }
            };
        }

        return options;
    }
}
