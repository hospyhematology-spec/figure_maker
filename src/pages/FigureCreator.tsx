import { useState, useEffect, useMemo, useRef } from 'react';
import { Download, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { FigureChart } from '../components/charts/FigureChart';
import { processData } from '../utils/dataProcessor';
import type { ParseResult } from '../utils/dataParser';
import type { ColumnMapping, FigureConfig, SeriesConfig } from '../types';
import styles from './FigureCreator.module.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface FigureCreatorProps {
    rawData: ParseResult;
    mappings: ColumnMapping[];
    onBack: () => void;
}

// Predefined colors (Hex for compatibility with input type="color")
const COLORS = [
    '#ef4444', // Red 500
    '#3b82f6', // Blue 500
    '#10b981', // Emerald 500
    '#f59e0b', // Amber 500
    '#8b5cf6', // Violet 500
    '#ec4899', // Pink 500
    '#06b6d4', // Cyan 500
    '#84cc16', // Lime 500
    '#6366f1', // Indigo 500
    '#f97316', // Orange 500
];

export const FigureCreator = ({ rawData, mappings, onBack }: FigureCreatorProps) => {
    const chartRef = useRef<HTMLDivElement>(null);

    // Memoize processed data to avoid reprocessing on every render unless mappings change
    const dataPoints = useMemo(() => {
        return processData(rawData, mappings);
    }, [rawData, mappings]);

    const [config, setConfig] = useState<FigureConfig>({
        width: 800,
        height: 500,
        chartWidth: 1000,
        chartHeight: 600,
        showLegend: true,
        showGrid: true,
        xAxis: { id: 'x-axis', position: 'bottom', label: 'Date', scale: 'time' },
        yAxes: [
            { id: 'left-1', position: 'left', label: 'Value', scale: 'linear' },
            { id: 'left-2', position: 'left', label: '', scale: 'linear' },
            { id: 'left-3', position: 'left', label: '', scale: 'linear' },
            { id: 'left-4', position: 'left', label: '', scale: 'linear' },
            { id: 'right-1', position: 'right', label: '', scale: 'linear' },
            { id: 'right-2', position: 'right', label: '', scale: 'linear' },
            { id: 'right-3', position: 'right', label: '', scale: 'linear' },
            { id: 'right-4', position: 'right', label: '', scale: 'linear' }
        ],
        series: []
    });

    useEffect(() => {
        // Generate initial series config from mappings
        const newSeries: SeriesConfig[] = mappings
            .filter(m => m.type === 'number')
            .map((m, idx) => ({
                id: `series-${idx}`,
                name: m.mappedName, // Use user defined name
                dataKey: m.mappedName,
                color: COLORS[idx % COLORS.length],
                type: 'line',
                yAxisId: (idx < 4 ? `left-${idx + 1}` : 'left-1') as SeriesConfig['yAxisId'], // Default assigned to left-1~4
                lineStyle: 'solid'
            }));

        // Only set if series is empty to avoid overwriting user adjustments on re-renders, 
        // unless mappings changed drastically. Ideally need smarter merge.
        if (newSeries.length > 0) {
            setConfig(prev => ({ ...prev, series: newSeries }));
        }
    }, [mappings]);

    const handleSeriesUpdate = (id: string, field: keyof SeriesConfig, value: any) => {
        setConfig(prev => ({
            ...prev,
            series: prev.series.map(s => s.id === id ? { ...s, [field]: value } : s)
        }));
    };

    const exportImage = async (format: 'png' | 'pdf') => {
        if (!chartRef.current) return;

        // Temporarily ensure background is white (for dark mode support)
        const originalBg = chartRef.current.style.backgroundColor;
        const originalColor = chartRef.current.style.color;

        chartRef.current.style.backgroundColor = '#ffffff';
        chartRef.current.style.color = '#000000';

        // We need to force a redraw or wait for styles to apply? usually sync changes are fine for canvas
        // But html2canvas might capture current computed styles.

        try {
            // Use scaling for better resolution
            const canvas = await html2canvas(chartRef.current, {
                scale: 2,
                backgroundColor: '#ffffff', // Force white bg in canvas
                logging: false
            });

            if (format === 'png') {
                const link = document.createElement('a');
                link.download = `figure-${new Date().toISOString().slice(0, 10)}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } else if (format === 'pdf') {
                const imgData = canvas.toDataURL('image/png');
                // Calculate aspect ratio to fit in PDF (A4 landscape)
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4'
                });

                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();

                const imgProps = pdf.getImageProperties(imgData);
                const pdfImgHeight = (imgProps.height * pageWidth) / imgProps.width;

                // Scale to fit if height is too big
                let renderWidth = pageWidth;
                let renderHeight = pdfImgHeight;

                if (pdfImgHeight > pageHeight) {
                    renderHeight = pageHeight;
                    renderWidth = (imgProps.width * pageHeight) / imgProps.height;
                }

                pdf.addImage(imgData, 'PNG', 0, 0, renderWidth, renderHeight);
                pdf.save(`figure-${new Date().toISOString().slice(0, 10)}.pdf`);
            }
        } catch (e) {
            console.error("Export failed", e);
            alert("Failed to export image.");
        } finally {
            chartRef.current.style.backgroundColor = originalBg;
            chartRef.current.style.color = originalColor;
        }
    };

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={onBack} className="p-1">
                            <ArrowLeft size={16} />
                        </Button>
                        <h3>Configuration</h3>
                    </div>
                </div>

                <div className={styles.sidebarContent}>
                    <div className={styles.controlGroup}>
                        <div className={styles.groupTitle}>Series Settings</div>
                        {config.series.map(series => (
                            <div key={series.id} className={styles.seriesItem}>
                                <div className={styles.colorPicker} style={{ backgroundColor: series.color }}>
                                    <input
                                        type="color"
                                        value={series.color}
                                        onChange={(e) => handleSeriesUpdate(series.id, 'color', e.target.value)}
                                        title="Change Color"
                                    />
                                </div>
                                <span className={styles.seriesName} title={series.name}>{series.name}</span>

                                <select
                                    className={styles.axisSelect}
                                    value={series.yAxisId}
                                    onChange={(e) => handleSeriesUpdate(series.id, 'yAxisId', e.target.value)}
                                    title="Axis Assignment"
                                >
                                    <optgroup label="Left Axes">
                                        <option value="left-1">Left 1</option>
                                        <option value="left-2">Left 2</option>
                                        <option value="left-3">Left 3</option>
                                        <option value="left-4">Left 4</option>
                                    </optgroup>
                                    <optgroup label="Right Axes">
                                        <option value="right-1">Right 1</option>
                                        <option value="right-2">Right 2</option>
                                        <option value="right-3">Right 3</option>
                                        <option value="right-4">Right 4</option>
                                    </optgroup>
                                </select>

                                <select
                                    className={styles.axisSelect}
                                    value={series.lineStyle || 'solid'}
                                    onChange={(e) => handleSeriesUpdate(series.id, 'lineStyle', e.target.value)}
                                    title="Line Style"
                                >
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className={styles.controlGroup}>
                        <div className={styles.groupTitle}>Chart Dimensions</div>
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-[hsl(var(--text-secondary))]">Width (px or 'auto')</label>
                                <input
                                    type="text"
                                    className="p-1.5 border rounded text-sm bg-[hsl(var(--bg-primary))]"
                                    value={config.chartWidth !== undefined ? config.chartWidth : ''}
                                    onChange={(e) => {
                                        const rawValue = e.target.value;
                                        if (rawValue === 'auto' || rawValue === '') {
                                            setConfig(prev => ({ ...prev, chartWidth: 'auto' }));
                                        } else {
                                            const numericValue = Number(rawValue);
                                            // ユーザーが入力中の文字列（例: "100"など）をそのまま許容するため
                                            // 'auto'以外の時は直接数値をいれる。ただし全消し時などは''経由でautoになる
                                            setConfig(prev => ({
                                                ...prev,
                                                chartWidth: isNaN(numericValue) ? prev.chartWidth : numericValue
                                            }));
                                        }
                                    }}
                                    placeholder="auto (e.g. 1000)"
                                />
                                <span className="text-[10px] text-[hsl(var(--text-secondary))]">Set to 'auto' to fit container. Increase to make chart wider and prevent squishing.</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-[hsl(var(--text-secondary))]">Height (px)</label>
                                <input
                                    type="number"
                                    className="p-1.5 border rounded text-sm bg-[hsl(var(--bg-primary))]"
                                    value={config.chartHeight || 600}
                                    onChange={(e) => {
                                        const val = e.target.value ? parseInt(e.target.value, 10) : 600;
                                        setConfig(prev => ({
                                            ...prev,
                                            chartHeight: val
                                        }));
                                    }}
                                    placeholder="600"
                                    min="200"
                                    max="3000"
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.controlGroup}>
                        <div className={styles.groupTitle}>Axis Settings</div>
                        <div className="flex flex-col gap-4 max-h-80 overflow-y-auto pr-2">
                            {config.yAxes.map((axis) => {
                                const isUsed = config.series.some(s => s.yAxisId === axis.id);
                                const isPrimary = axis.id === 'left-1' || axis.id === 'right-1';

                                if (!isUsed && !isPrimary) return null;

                                return (
                                    <div key={`setting-${axis.id}`} className="flex flex-col gap-2 p-2 bg-[hsl(var(--bg-secondary))] rounded border border-[hsl(var(--border-color))]">
                                        <label className="text-sm font-bold text-[hsl(var(--text-primary))]">
                                            {axis.id.replace('-', ' ').toUpperCase()}
                                        </label>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-[hsl(var(--text-secondary))]">Label</label>
                                            <input
                                                className="p-1.5 border rounded text-sm bg-[hsl(var(--bg-primary))]"
                                                value={axis.label || ''}
                                                onChange={(e) => setConfig(prev => ({
                                                    ...prev,
                                                    yAxes: prev.yAxes.map(a => a.id === axis.id ? { ...a, label: e.target.value } : a)
                                                }))}
                                                placeholder="e.g. mg/dL"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-[hsl(var(--text-secondary))]">Min</label>
                                                <input
                                                    type="text"
                                                    className="p-1.5 border rounded text-sm bg-[hsl(var(--bg-primary))]"
                                                    value={axis.min !== undefined ? axis.min : 'auto'}
                                                    onChange={(e) => {
                                                        const val = e.target.value === 'auto' || e.target.value === '' ? 'auto' : Number(e.target.value);
                                                        setConfig(prev => ({
                                                            ...prev,
                                                            yAxes: prev.yAxes.map(a => a.id === axis.id ? { ...a, min: isNaN(val as number) && val !== 'auto' ? 'auto' : val } : a)
                                                        }));
                                                    }}
                                                    placeholder="auto"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-[hsl(var(--text-secondary))]">Max</label>
                                                <input
                                                    type="text"
                                                    className="p-1.5 border rounded text-sm bg-[hsl(var(--bg-primary))]"
                                                    value={axis.max !== undefined ? axis.max : 'auto'}
                                                    onChange={(e) => {
                                                        const val = e.target.value === 'auto' || e.target.value === '' ? 'auto' : Number(e.target.value);
                                                        setConfig(prev => ({
                                                            ...prev,
                                                            yAxes: prev.yAxes.map(a => a.id === axis.id ? { ...a, max: isNaN(val as number) && val !== 'auto' ? 'auto' : val } : a)
                                                        }));
                                                    }}
                                                    placeholder="auto"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-[hsl(var(--text-secondary))]">Ticks (Count)</label>
                                            <input
                                                type="number"
                                                className="p-1.5 border rounded text-sm bg-[hsl(var(--bg-primary))]"
                                                value={axis.tickCount || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                                                    setConfig(prev => ({
                                                        ...prev,
                                                        yAxes: prev.yAxes.map(a => a.id === axis.id ? { ...a, tickCount: val } : a)
                                                    }));
                                                }}
                                                placeholder="auto (e.g. 5)"
                                                min="2"
                                                max="100"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-[hsl(var(--border-color))] flex flex-col gap-2 bg-[hsl(var(--bg-secondary))]">
                    <Button onClick={() => exportImage('png')} className="w-full">
                        <Download className="mr-2 h-4 w-4" /> Download PNG
                    </Button>
                    <Button variant="outline" onClick={() => exportImage('pdf')} className="w-full">
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </div>
            </aside>

            <main className={styles.chartArea} ref={chartRef}>
                <div className="flex-1 w-full h-full min-h-0 flex flex-col overflow-x-auto overflow-y-auto">
                    {dataPoints.length > 0 ? (
                        <div style={{
                            minWidth: config.chartWidth === 'auto' ? '100%' : `${config.chartWidth}px`,
                            height: '100%'
                        }}>
                            <FigureChart
                                data={dataPoints}
                                xAxis={config.xAxis}
                                yAxes={config.yAxes}
                                series={config.series}
                                height={config.chartHeight || 600}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
                            <p className="text-lg">No data available to display.</p>
                            <p className="text-sm">Please check your data mapping.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
