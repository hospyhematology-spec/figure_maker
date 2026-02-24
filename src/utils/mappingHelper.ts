import type { ParseResult } from './dataParser';
import type { ColumnMapping, ColumnType } from '../types';

export const autoDetectMappings = (parseResult: ParseResult): ColumnMapping[] => {
    const { data, columns } = parseResult;
    // Use first 10 rows for sampling
    const sampleSize = Math.min(data.length, 10);
    const sampleData = data.slice(0, sampleSize);

    return columns.map(originalName => {
        let type: ColumnType = 'string';
        let unit: string | undefined = undefined;
        let isSeries = false;

        const lowerCol = originalName.toLowerCase();

        // 1. Check patterns in Column Name first (Strong hints)

        // Date/Time patterns
        if (/(date|time|day|year|month|dt|日付|日時|時間)/.test(lowerCol)) {
            type = 'date';
        }
        // ID/Series patterns
        else if (/(id|series|group|subject|patient|系列|患者|名前|name)/.test(lowerCol)) {
            type = 'string';
            isSeries = true;
        }
        else {
            // 2. Check content statistics if name is ambiguous
            let numberCount = 0;
            let dateLikeCount = 0;
            let validCount = 0;

            for (const row of sampleData) {
                const val = row[originalName];
                if (val === null || val === undefined || val === '') continue;

                validCount++;

                // Check Number
                // Be careful with strings that look like dates but parse as numbers (e.g. timestamps)
                if (!isNaN(Number(val)) && String(val).trim() !== '') {
                    numberCount++;
                }

                // Check Date-like string or Date object
                // Simple distinct check: contains / or - or : which suggests format
                const strVal = String(val);
                if (val instanceof Date && !isNaN(val.getTime())) {
                    dateLikeCount++;
                } else if ((strVal.includes('/') || strVal.includes('-') || strVal.includes(':')) && !isNaN(Date.parse(strVal))) {
                    dateLikeCount++;
                }
            }

            if (validCount > 0) {
                // Prioritize Date if specific chars found, otherwise Number
                if (dateLikeCount / validCount > 0.6) {
                    type = 'date';
                } else if (numberCount / validCount > 0.8) {
                    type = 'number';
                }
            }
        }

        // 3. Extract unit from column name like "Weight (kg)" or "Conc [mg/dL]"
        // (.*?): Non-greedy match inside parens or brackets
        const unitMatchParens = originalName.match(/\((.+?)\)/);
        const unitMatchBrackets = originalName.match(/\[(.+?)\]/);

        if (unitMatchParens) {
            unit = unitMatchParens[1];
        } else if (unitMatchBrackets) {
            unit = unitMatchBrackets[1];
        }

        // Heuristic: If it's a number, it's NOT a series usually, unless specified
        if (type === 'number') {
            isSeries = false;
        }

        return {
            originalName,
            mappedName: originalName,
            type,
            unit,
            isSeries,
        };
    });
};
