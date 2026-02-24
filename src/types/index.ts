export type ColumnType = 'date' | 'number' | 'string' | 'category' | 'ignore';

export interface ColumnMapping {
  originalName: string;
  mappedName: string; // User defined name
  type: ColumnType;
  unit?: string;
  isSeries?: boolean; // If true, values in this column define series
  format?: string; // Date format or number format
}

export interface DataPoint {
  id: string; // Unique ID
  date?: string | Date; // Standardized date
  [key: string]: any; // Dynamic values based on mappedName
}

export interface SeriesConfig {
  id: string;
  name: string;
  dataKey: string; // The key in DataPoint object
  color: string;
  type: 'line' | 'scatter' | 'bar';
  marker?: 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'none';
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  strokeWidth?: number;
  yAxisId: string; // Which Y-axis to use (left/right, 1-4)
}

export interface AxisConfig {
  id: string;
  position: 'left' | 'right' | 'bottom' | 'top';
  label?: string;
  unit?: string;
  domain?: [number | 'auto', number | 'auto'];
  scale?: 'linear' | 'log' | 'time';
  reversed?: boolean;
}

export interface FigureConfig {
  title?: string;
  width: number;
  height: number;
  xAxis: AxisConfig;
  yAxes: AxisConfig[];
  series: SeriesConfig[];
  showLegend: boolean;
  showGrid: boolean;
  annotations?: Annotation[];
}

export interface Annotation {
  id: string;
  type: 'line' | 'text' | 'range';
  value: number | string | Date; // x or y value
  axisId?: string; // If applicable
  content?: string;
  color?: string;
}

export interface ProjectState {
  rawData: any[];
  mappings: ColumnMapping[];
  processedData: DataPoint[];
  figureConfig: FigureConfig;
}
