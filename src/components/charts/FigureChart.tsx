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
}

export const FigureChart: React.FC<FigureChartProps> = ({
    data,
    xAxis,
    yAxes,
    series,
    height = 500
}) => {
    // Format dates for X-axis ticks
    const formatXAxis = (tickItem: number | string) => {
        try {
            // If we use timestamp number for X-axis domain need to format back
            if (typeof tickItem === 'number') {
                return format(new Date(tickItem), 'MM/dd');
            }
            // If using ISO string (though we target number type)
            return format(new Date(tickItem), 'MM/dd');
        } catch (e) {
            return String(tickItem);
        }
    };

    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <LineChart
                    data={data}
                    margin={{
                        top: 20,
                        // Add extra margin if there are multiple right axes
                        right: 30 + Math.max(0, yAxes.filter(a => a.position === 'right').length - 1) * 60,
                        // Add extra margin if there are multiple left axes
                        left: 20 + Math.max(0, yAxes.filter(a => a.position === 'left').length - 1) * 60,
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

                    {yAxes.map((axis) => {
                        // For Recharts to not overlap, we need to manually place them or use orientation smartly
                        // Recharts typically handles multiple YAxis natively if we give them different yAxisId 
                        // and they stack outwards if we just render them. 
                        // We will rely on Recharts' default layout for multiple axes on same side, but apply user domain.

                        return (
                            <YAxis
                                key={axis.id}
                                yAxisId={axis.id}
                                orientation={axis.position === 'right' ? 'right' : 'left'}
                                domain={axis.min !== undefined || axis.max !== undefined ? [axis.min ?? 'auto', axis.max ?? 'auto'] : (axis.domain || ['auto', 'auto'])}
                                tickCount={axis.tickCount}
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
