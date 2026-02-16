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
        showLegend: true,
        showGrid: true,
        xAxis: { id: 'x-axis', position: 'bottom', label: 'Date', scale: 'time' },
        yAxes: [
            { id: 'left', position: 'left', label: 'Value', scale: 'linear' },
            { id: 'right', position: 'right', label: '', scale: 'linear' }
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
                yAxisId: 'left', // Default to left axis
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
                                    <option value="left">Left (L)</option>
                                    <option value="right">Right (R)</option>
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
                        <div className={styles.groupTitle}>Axis Labels</div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-[hsl(var(--text-secondary))]">Left Axis</label>
                            <input
                                className="p-2 border rounded text-sm bg-[hsl(var(--bg-primary))]"
                                value={config.yAxes.find(a => a.id === 'left')?.label || ''}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    yAxes: prev.yAxes.map(a => a.id === 'left' ? { ...a, label: e.target.value } : a)
                                }))}
                                placeholder="Label (e.g. mg/dL)"
                            />
                            <label className="text-xs font-medium text-[hsl(var(--text-secondary))] mt-2">Right Axis</label>
                            <input
                                className="p-2 border rounded text-sm bg-[hsl(var(--bg-primary))]"
                                value={config.yAxes.find(a => a.id === 'right')?.label || ''}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    yAxes: prev.yAxes.map(a => a.id === 'right' ? { ...a, label: e.target.value } : a)
                                }))}
                                placeholder="Label (Optional)"
                            />
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
                <div className="flex-1 w-full h-full min-h-0 flex flex-col">
                    {dataPoints.length > 0 ? (
                        <FigureChart
                            data={dataPoints}
                            xAxis={config.xAxis}
                            yAxes={config.yAxes}
                            series={config.series}
                            height={600}
                        />
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
