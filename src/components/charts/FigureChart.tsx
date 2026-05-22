import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { DataPoint, AxisConfig, SeriesConfig } from '../../types';

interface FigureChartProps {
    data: DataPoint[];
    xAxis: AxisConfig;
    yAxes: AxisConfig[];
    series: SeriesConfig[];
    height?: number;
    axisBounds?: Record<string, { min?: number; max?: number }>;
}

export const FigureChart: React.FC<FigureChartProps> = ({
    data,
    xAxis,
    yAxes,
    series,
    height = 500,
    axisBounds = {}
}) => {
    const formatXAxis = (tickItem: number | string) => {
        try {
            let dateVal: Date;
            if (typeof tickItem === 'number') {
                dateVal = new Date(tickItem);
            } else {
                dateVal = new Date(tickItem);
            }

            // day表示の場合の処理
            if (xAxis.tickFormat === 'day0' || xAxis.tickFormat === 'day1') {
                // data配列の最初（インデックス0）が最も古い日付（ソート済前提）
                if (data.length > 0) {
                    const firstDateVal = data[0]._timestamp || data[0].date || 0;
                    const firstDate = new Date(firstDateVal as string | number);
                    // 時間差をミリ秒で計算し、日数に変換 (四捨五入して整数日へ)
                    const diffTime = Math.abs(dateVal.getTime() - firstDate.getTime());
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                    if (xAxis.tickFormat === 'day0') {
                        return `Day ${diffDays}`;
                    } else {
                        return `Day ${diffDays + 1}`;
                    }
                }
            }

            // デフォルトは日付表示
            return format(dateVal, 'MM/dd');
        } catch (e) {
            return String(tickItem);
        }
    };

    // 使用されているYAxisのみを抽出（あるいはleft-1のみ常に表示）
    const activeYAxes = yAxes.filter(axis =>
        series.some(s => s.yAxisId === axis.id) || axis.id === 'left-1'
    );

    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <LineChart
                    data={data}
                    margin={{
                        top: 20,
                        // 使用中の軸の数だけでマージンを計算する
                        right: 30 + Math.max(0, activeYAxes.filter(a => a.position === 'right').length - 1) * 60,
                        left: 20 + Math.max(0, activeYAxes.filter(a => a.position === 'left').length - 1) * 60,
                        bottom: 20,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border-color))" />

                    <XAxis
                        dataKey="_timestamp" // Use timestamp for linear scale if available
                        type="number"
                        domain={['auto', 'auto']}
                        tickFormatter={formatXAxis}
                        scale="time"
                        name={xAxis.label || 'Date'}
                        stroke="hsl(var(--text-secondary))"
                        tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }}
                    />

                    {activeYAxes.map((axis) => {
                        // For Recharts to not overlap, we need to manually place them or use orientation smartly
                        
                        let customTicks = undefined;
                        if (axis.tickInterval && axis.tickInterval > 0) {
                            const bounds = axisBounds[axis.id] || {};
                            const finalMin = axis.min !== 'auto' && axis.min !== undefined ? axis.min : bounds.min;
                            const finalMax = axis.max !== 'auto' && axis.max !== undefined ? axis.max : bounds.max;
                            
                            if (finalMin !== undefined && finalMax !== undefined) {
                                customTicks = [];
                                // start at the first multiple of tickInterval >= finalMin
                                let current = Math.ceil(finalMin / axis.tickInterval) * axis.tickInterval;
                                // If they set exact min/max, they might want them included, but standard graphs just use multiples.
                                // We'll just generate the multiples.
                                while (current <= finalMax) {
                                    customTicks.push(current);
                                    current += axis.tickInterval;
                                }
                            }
                        }

                        return (
                            <YAxis
                                key={axis.id}
                                yAxisId={axis.id}
                                type="number"
                                allowDataOverflow={true}
                                orientation={axis.position === 'right' ? 'right' : 'left'}
                                domain={axis.min !== undefined || axis.max !== undefined ? [axis.min ?? 'auto', axis.max ?? 'auto'] : (axis.domain || ['auto', 'auto'])}
                                ticks={customTicks}
                                stroke="hsl(var(--text-secondary))"
                                tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }}
                                tickFormatter={(val) => val.toLocaleString()} // Add basic number formatting
                                label={{
                                    value: axis.label,
                                    angle: -90,
                                    position: axis.position === 'right' ? 'insideRight' : 'insideLeft',
                                    fill: 'hsl(var(--text-secondary))',
                                    style: { textAnchor: 'middle' },
                                    offset: 0
                                }}
                            />
                        );
                    })}

                    <Tooltip
                        labelFormatter={(value) => {
                            try {
                                return format(new Date(value), "yyyy-MM-dd HH:mm");
                            } catch {
                                return value;
                            }
                        }}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border-color))',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            color: 'hsl(var(--card-foreground))'
                        }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />

                    {series.map((s) => (
                        <Line
                            key={s.id}
                            yAxisId={s.yAxisId}
                            type="linear" // Changed from monotone to linear (straight lines)
                            dataKey={s.dataKey}
                            name={s.name}
                            stroke={s.color}
                            strokeWidth={s.strokeWidth || 2}
                            dot={{ r: 3, strokeWidth: 1 }}
                            activeDot={{ r: 6 }}
                            strokeDasharray={s.lineStyle === 'dashed' ? "5 5" : undefined}
                            connectNulls={true} // Default to connect gaps
                            isAnimationActive={false} // Disable animation for large datasets perf
                        />
                    ))}

                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
