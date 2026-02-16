import * as XLSX from 'xlsx';

export interface ParseResult {
    data: any[];
    columns: string[];
    fileName?: string;
    error?: string;
}

export const parseFile = (file: File): Promise<ParseResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                // Use 'array' type for robustness with binary files
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to array of arrays first to handle headers manually
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (!jsonData || jsonData.length === 0) {
                    resolve({ data: [], columns: [], fileName: file.name });
                    return;
                }

                // Assume first row is header
                // Filter out empty headers or generated ones if possible, but for now simple string conversion
                const headers = (jsonData[0] as any[]).map((h, i) => String(h || `Column ${i + 1}`));

                const rows = jsonData.slice(1);
                const formattedData = rows.map((row: any) => {
                    const obj: any = {};
                    headers.forEach((header, index) => {
                        // Handle undefined/null values
                        obj[header] = row[index] !== undefined ? row[index] : null;
                    });
                    return obj;
                });

                resolve({
                    data: formattedData,
                    columns: headers,
                    fileName: file.name
                });

            } catch (err) {
                console.error("File parsing error:", err);
                // Better to reject here so callee knows it failed, or resolve with error field as per interface design.
                // Given the interface has 'error' field, we decided to resolve. But to remove lint error for unused reject:
                // Let's actually use reject for critical failures if we wanted, but here we are designing to return an error object.
                // However, to fix the lint:
                reject(err);
            }
        };

        reader.onerror = (err) => {
            console.error("File reading error:", err);
            reject(err);
        };

        reader.readAsArrayBuffer(file);
    });
};

export const parseTextData = (text: string): ParseResult => {
    // 1. Try to parse as CSV/TSV first using XLSX
    try {
        // XLSX.read string input expects type: 'string'
        const workbook = XLSX.read(text, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Heuristic: If we got multiple columns or multiple rows, it's likely structured data
        if (jsonData && jsonData.length > 0 && Array.isArray(jsonData[0]) && (jsonData[0] as any[]).length > 1) {
            const headers = (jsonData[0] as any[]).map((h, i) => String(h || `Column ${i + 1}`));
            const rows = jsonData.slice(1);
            const formattedData = rows.map((row: any) => {
                const obj: any = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                return obj;
            });
            return { data: formattedData, columns: headers };
        }
    } catch (e) {
        // Continue to next parsing strategy
    }

    // 2. Fallback to specific "Free Text" regex for "Item Value (Date)" format
    // Example target: "WBC 12.3 (2026-02-01)"
    const lines = text.split('\n').filter(l => l.trim());
    const data: any[] = [];
    const freeTextHeaders = ['Item', 'Value', 'Date', 'Unit'];

    // Regex Breakdown:
    // ^(.+?)           -> Item name (non-greedy)
    // \s+              -> Separator
    // ([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?) -> Number (Value)
    // \s*              -> Optional space
    // ([a-zA-Z%\/]+)?  -> Optional Unit (simple match)
    // \s*              -> Optional spaceBefore date
    // (?:\((.+?)\))?   -> Optional Date inside parens
    const regex = /^(.+?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s*([a-zA-Z%\/]+)?\s*(?:\((.+?)\))?$/;

    lines.forEach(line => {
        const match = line.match(regex);
        if (match) {
            data.push({
                Item: match[1].trim(),
                Value: parseFloat(match[2]),
                Unit: match[3] || null,
                Date: match[4] || null
            });
        }
    });

    if (data.length > 0) {
        return { data, columns: freeTextHeaders };
    }

    // 3. Fallback: Treat as simple list if nothing else matches
    return { data: [], columns: [], error: 'Could not parse text data. Try CSV, TSV or "Item Value (Date)" format.' };
};
