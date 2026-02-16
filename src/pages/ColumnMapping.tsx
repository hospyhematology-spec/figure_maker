import { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import type { ParseResult } from '../utils/dataParser';
import type { ColumnMapping, ColumnType } from '../types';
import { autoDetectMappings } from '../utils/mappingHelper';
import styles from './ColumnMapping.module.css';

interface ColumnMappingPageProps {
    data: ParseResult;
    onBack: () => void;
    onNext: (mappings: ColumnMapping[]) => void;
}

export const ColumnMappingPage = ({ data, onBack, onNext }: ColumnMappingPageProps) => {
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);

    useEffect(() => {
        if (data && data.columns.length > 0) {
            const initial = autoDetectMappings(data);
            setMappings(initial);
        }
    }, [data]);

    const handleUpdate = (index: number, field: keyof ColumnMapping, value: any) => {
        const updated = [...mappings];
        updated[index] = { ...updated[index], [field]: value };
        setMappings(updated);
    };

    const handleReset = () => {
        setMappings(autoDetectMappings(data));
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h2 className="text-2xl font-bold mb-2">2. Map Columns</h2>
                <p className="text-[hsl(var(--text-secondary))]">
                    Assign types and roles to your data columns.
                    <Button variant="ghost" size="sm" onClick={handleReset} className="ml-4 text-xs inline-flex items-center gap-1 border border-dashed border-[hsl(var(--border-color))]">
                        <RefreshCw size={12} /> Auto-Detect
                    </Button>
                </p>
            </header>

            <div className={styles.mappingGrid}>
                {mappings.map((col, idx) => (
                    <div key={idx} className={`${styles.columnCard} ${col.type === 'ignore' ? 'opacity-50' : ''}`}>
                        <div className={styles.cardHeader}>
                            <span className={styles.originalName} title={col.originalName}>{col.originalName}</span>
                            <span className={`${styles.typeBadge} ${styles['type' + (col.type.charAt(0).toUpperCase() + col.type.slice(1))] || ''}`}>
                                {col.type}
                            </span>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Type</label>
                            <select
                                className={styles.select}
                                value={col.type}
                                onChange={(e) => handleUpdate(idx, 'type', e.target.value as ColumnType)}
                            >
                                <option value="date">Date (X-Axis)</option>
                                <option value="number">Number (Y-Axis)</option>
                                <option value="string">Text / Series</option>
                                <option value="category">Category</option>
                                <option value="ignore">Ignore</option>
                            </select>
                        </div>

                        {col.type !== 'ignore' && (
                            <>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Display Name</label>
                                    <input
                                        className={styles.input}
                                        value={col.mappedName}
                                        onChange={(e) => handleUpdate(idx, 'mappedName', e.target.value)}
                                    />
                                </div>

                                {(col.type === 'number') && (
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Unit</label>
                                        <input
                                            className={styles.input}
                                            value={col.unit || ''}
                                            placeholder="e.g. mg/dL"
                                            onChange={(e) => handleUpdate(idx, 'unit', e.target.value)}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        <div className={styles.previewData}>
                            <strong>Sample: </strong>
                            <span className={styles.previewItem}>
                                {String(data.data[0]?.[col.originalName] ?? '')}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.actions}>
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => onNext(mappings)}>
                    Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
