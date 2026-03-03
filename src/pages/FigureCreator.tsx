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
        chartWidth: 'auto',
        showLegend: true,
        showGrid: true,
        xAxis: { id: 'x-axis', position: 'bottom', label: 'Date', scale: 'time' },
        yAxes: [
            { id: 'left-1', position: 'left', label: '', scale: 'linear' },
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

    const [isFitToScreen, setIsFitToScreen] = useState(false);

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
            // Wait for any potential layout shifts to settle
            await new Promise(resolve => setTimeout(resolve, 50));

            // To prevent right-side cropping on scrolling charts:
            // Temporarily store old overflow values and override them
            const originalOverflow = chartRef.current.style.overflow;
            const scrollWidth = chartRef.current.scrollWidth;
            const scrollHeight = chartRef.current.scrollHeight;

            chartRef.current.style.overflow = 'visible';

            // Use scaling for better resolution, and force dimensions to encompass full scroll area
            const canvas = await html2canvas(chartRef.current, {
                scale: 2,
                backgroundColor: '#ffffff', // Force white bg in canvas
                logging: false,
                width: scrollWidth,
                height: scrollHeight,
                windowWidth: scrollWidth,
                windowHeight: scrollHeight,
                x: 0,
                y: 0
            });

            // Restore original overflow style
            chartRef.current.style.overflow = originalOverflow;

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
                        <h3>グラフ設定 (Configuration)</h3>
                    </div>
                </div>

                <div className={styles.sidebarContent}>
                    <div className={styles.controlGroup}>
                        <div className={styles.groupTitle}>波形と系列の設定 (Series Settings)</div>
                        {config.series.map(series => (
                            <div key={series.id} className={styles.seriesItem}>
                                <div className={styles.colorPicker} style={{ backgroundColor: series.color }}>
                                    <input
                                        type="color"
                                        value={series.color}
                                        onChange={(e) => handleSeriesUpdate(series.id, 'color', e.target.value)}
                                        title="色を変更"
                                    />
                                </div>
                                <span className={styles.seriesName} title={series.name}>{series.name}</span>

                                <select
                                    className={styles.axisSelect}
                                    value={series.yAxisId}
                                    onChange={(e) => handleSeriesUpdate(series.id, 'yAxisId', e.target.value)}
                                    title="軸の割り当て (Axis Assignment)"
                                >
                                    <optgroup label="左側の軸 (Left Axes)">
                                        <option value="left-1">左側 1 (Left 1)</option>
                                        <option value="left-2">左側 2 (Left 2)</option>
                                        <option value="left-3">左側 3 (Left 3)</option>
                                        <option value="left-4">左側 4 (Left 4)</option>
                                    </optgroup>
                                    <optgroup label="右側の軸 (Right Axes)">
                                        <option value="right-1">右側 1 (Right 1)</option>
                                        <option value="right-2">右側 2 (Right 2)</option>
                                        <option value="right-3">右側 3 (Right 3)</option>
                                        <option value="right-4">右側 4 (Right 4)</option>
                                    </optgroup>
                                </select>

                                <select
                                    className={styles.axisSelect}
                                    value={series.lineStyle || 'solid'}
                                    onChange={(e) => handleSeriesUpdate(series.id, 'lineStyle', e.target.value)}
                                    title="線のスタイル (Line Style)"
                                >
                                    <option value="solid">実線 (Solid)</option>
                                    <option value="dashed">破線 (Dashed)</option>
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className={styles.controlGroup}>
                        <div className={styles.groupTitle}>グラフのレイアウト (Chart Layout)</div>
                        <div className="flex flex-col gap-2 p-2 bg-[hsl(var(--bg-secondary))] rounded border border-[hsl(var(--border-color))]">
                            <label className="text-sm font-bold text-[hsl(var(--text-primary))]">
                                横幅 (GRAPH WIDTH)
                            </label>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-[hsl(var(--text-secondary))]">幅 (ピクセル指定 または 'auto')</label>
                                <input
                                    type="text"
                                    className="p-1.5 border rounded text-sm bg-[hsl(var(--bg-primary))]"
                                    value={config.chartWidth !== undefined ? config.chartWidth : ''}
                                    onChange={(e) => {
                                        const rawValue = e.target.value;
                                        if (rawValue === 'auto') {
                                            setConfig(prev => ({ ...prev, chartWidth: 'auto' }));
                                        } else if (rawValue === '') {
                                            // 途中空欄にしても許容
                                            setConfig(prev => ({ ...prev, chartWidth: '' as unknown as 'auto' }));
                                        } else {
                                            const numericValue = Number(rawValue);
                                            // 入力が数値として解釈できればそのまま反映
                                            if (!isNaN(numericValue)) {
                                                setConfig(prev => ({ ...prev, chartWidth: numericValue }));
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // フォーカスが外れた際に空欄ならautoに戻す
                                        if (e.target.value === '') {
                                            setConfig(prev => ({ ...prev, chartWidth: 'auto' }));
                                        }
                                    }}
                                    placeholder="auto (e.g. 1000)"
                                />
                                <span className="text-[10px] text-[hsl(var(--text-secondary))]">
                                    画面に合わせる場合は空欄または'auto'。ピクセルで固定する場合は数値を入力してください。
                                </span>
                            </div>

                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isFitToScreen}
                                    onChange={(e) => setIsFitToScreen(e.target.checked)}
                                    className="rounded border-[hsl(var(--border-color))]"
                                    disabled={config.chartWidth === 'auto' || (config.chartWidth as any) === ''}
                                />
                                <span className="text-sm text-[hsl(var(--text-primary))]">画面サイズに合わせて全体を縮小表示 (Fit to Screen)</span>
                            </label>
                            {(config.chartWidth === 'auto' || (config.chartWidth as any) === '') && (
                                <span className="text-[10px] text-amber-600 mt-[-4px]">
                                    * 固定の横幅（数値）が設定されている場合のみ有効です。
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={styles.controlGroup}>
                        <div className={styles.groupTitle}>横軸の設定 (X-Axis Settings)</div>
                        <div className="flex flex-col gap-2 p-2 bg-[hsl(var(--bg-secondary))] rounded border border-[hsl(var(--border-color))]">
                            <label className="text-sm font-bold text-[hsl(var(--text-primary))]">
                                横軸の日付表記 (X-AXIS DATE)
                            </label>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-[hsl(var(--text-secondary))]">表示形式 (Display Format)</label>
                                <select
                                    className="p-1.5 border rounded text-sm bg-[hsl(var(--bg-primary))]"
                                    value={config.xAxis.tickFormat || 'date'}
                                    onChange={(e) => setConfig(prev => ({
                                        ...prev,
                                        xAxis: { ...prev.xAxis, tickFormat: e.target.value as 'date' | 'day0' | 'day1' }
                                    }))}
                                >
                                    <option value="date">元のカレンダー日付 (例: 12/31)</option>
                                    <option value="day0">Day 0 基準 (Day 0, Day 1...)</option>
                                    <option value="day1">Day 1 基準 (Day 1, Day 2...)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className={styles.controlGroup}>
                        <div className={styles.groupTitle}>縦軸の設定 (Y-Axis Settings)</div>
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
                                            <label className="text-xs text-[hsl(var(--text-secondary))]">見出し (Label)</label>
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
                                                <label className="text-xs text-[hsl(var(--text-secondary))]">最小値 (Min)</label>
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
                                                <label className="text-xs text-[hsl(var(--text-secondary))]">最大値 (Max)</label>
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
                                            <label className="text-xs text-[hsl(var(--text-secondary))]">目盛りの刻み数 (Increments)</label>
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
                        <Download className="mr-2 h-4 w-4" /> PNG画像をダウンロード
                    </Button>
                    <Button variant="outline" onClick={() => exportImage('pdf')} className="w-full">
                        <Download className="mr-2 h-4 w-4" /> PDFをダウンロード
                    </Button>
                </div>
            </aside>

            <main className={styles.chartArea}>
                <div
                    ref={chartRef}
                    className="flex-1 w-full h-full min-h-0 flex flex-col overflow-x-auto overflow-y-auto relative"
                >
                    {dataPoints.length > 0 ? (
                        <div style={{
                            // Fit to ScreenがONなら強制的に100%（画面幅に圧縮）、そうでないなら手動幅または自動計算幅を適用
                            minWidth: isFitToScreen
                                ? '100%'
                                : (typeof config.chartWidth === 'number' && !isNaN(config.chartWidth))
                                    ? `${config.chartWidth}px`
                                    : `${Math.max(800, dataPoints.length * 30)}px`,
                            width: isFitToScreen
                                ? '100%'
                                : (typeof config.chartWidth === 'number' && !isNaN(config.chartWidth))
                                    ? `${config.chartWidth}px`
                                    : '100%',
                            height: '100%',
                        }}>
                            <FigureChart
                                data={dataPoints}
                                xAxis={config.xAxis}
                                yAxes={config.yAxes}
                                series={config.series}
                                height={600}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
                            <p className="text-lg">表示するデータがありません。</p>
                            <p className="text-sm">データの割り当て（ステップ2）をご確認ください。</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
