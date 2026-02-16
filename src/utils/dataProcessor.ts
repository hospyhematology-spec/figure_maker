import type { ParseResult } from './dataParser';
import type { ColumnMapping, DataPoint } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ProcessingOptions {
    handleMissing?: 'gap' | 'zero' | 'exclude'; // default 'gap' (null)
    handleDuplicates?: 'mean' | 'max' | 'latest' | 'all'; // default 'all' (jitter not implemented yet)
}

export const processData = (
    rawData: ParseResult,
    mappings: ColumnMapping[],
    options: ProcessingOptions = {}
): DataPoint[] => {
    const { data } = rawData;
    const processed: DataPoint[] = [];

    // 1. Identify key columns
    const dateCol = mappings.find(m => m.type === 'date');

    if (!dateCol) {
        console.warn("No date column mapped.");
        return [];
    }

    // 2. Process each row
    data.forEach((row) => {
        const dateVal = row[dateCol.originalName];
        let parsedDate: Date | null = null;

        if (dateVal instanceof Date) {
            parsedDate = dateVal;
        } else if (typeof dateVal === 'string') {
            parsedDate = new Date(dateVal);
            // Fallback for Excel serial dates if needed, but xlsx usually handles dates
            if (isNaN(parsedDate.getTime()) && !isNaN(Number(dateVal))) {
                // Excel date serial number handling
                parsedDate = new Date((Number(dateVal) - 25569) * 86400 * 1000);
            }
        } else if (typeof dateVal === 'number') {
            // Excel serialization check (approx > 20000)
            if (dateVal > 30000) {
                parsedDate = new Date((dateVal - 25569) * 86400 * 1000);
            } else {
                parsedDate = new Date(dateVal); // Timestamp
            }
        }

        if (!parsedDate || isNaN(parsedDate.getTime())) {
            // Skip invalid dates
            return;
        }

        const point: DataPoint = {
            id: uuidv4(),
            date: parsedDate.toISOString(), // Standardize to ISO string for sorting/storage
            // We can add extra properties dynamically, TS index signature in DataPoint allows it
            _timestamp: parsedDate.getTime(),
        };

        // Map other columns
        let shouldExclude = false;
        mappings.forEach(map => {
            if (map.type === 'ignore' || map.type === 'date') return;

            const val = row[map.originalName];

            if (map.type === 'number') {
                let numVal = parseFloat(val);

                // Handle special text cases like "<0.01"
                if (isNaN(numVal) && typeof val === 'string') {
                    const trimmed = val.trim();
                    if (trimmed.startsWith('<')) {
                        numVal = parseFloat(trimmed.replace(/[<>=]/g, '')) - 0.0001;
                    } else if (trimmed.startsWith('>')) {
                        numVal = parseFloat(trimmed.replace(/[<>=]/g, '')) + 0.0001; // epsilon higher
                    }
                }

                // Apply Missing Value Strategy
                if (isNaN(numVal)) {
                    if (options.handleMissing === 'zero') {
                        point[map.mappedName] = 0;
                    } else if (options.handleMissing === 'exclude') {
                        shouldExclude = true; // Mark row for exclusion if any value is missing (strict) or handle per series
                        point[map.mappedName] = null;
                    } else {
                        point[map.mappedName] = null; // 'gap'
                    }
                } else {
                    point[map.mappedName] = numVal;
                }

            } else {
                // String / Category
                point[map.mappedName] = val;
            }
        });

        if (!shouldExclude) {
            processed.push(point);
        }
    });

    // 3. Sort by date
    processed.sort((a, b) => (a._timestamp as number) - (b._timestamp as number));

    return processed;
};
