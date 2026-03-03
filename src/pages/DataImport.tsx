import { useState } from 'react';
import { parseFile, parseTextData } from '../utils/dataParser';
import type { ParseResult } from '../utils/dataParser';
import { Dropzone } from '../components/ui/Dropzone';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Clipboard, ArrowRight, Loader2, Download } from 'lucide-react';
import styles from './DataImport.module.css';

interface DataImportProps {
    onDataLoaded: (result: ParseResult) => void;
}

export const DataImport = ({ onDataLoaded }: DataImportProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleFileDrop = async (files: File[]) => {
        if (files.length === 0) return;

        setIsLoading(true);
        setError(null);
        try {
            // Use the first file
            const result = await parseFile(files[0]);
            if (result.error) {
                setError(result.error);
            } else {
                onDataLoaded(result);
            }
        } catch (err) {
            setError("ファイルの処理に失敗しました。");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setTextInput(text);
            setError(null);
        } catch (err) {
            setError("クリップボードからの直接読みとりに失敗しました。ショートカット（Ctrl+V または Cmd+V）を使用してください。");
            console.error(err);
        }
    };

    const handleTextSubmit = () => {
        if (!textInput.trim()) return;

        setIsLoading(true);
        setError(null);

        // Simulate async for UI consistency and to allow UI update
        setTimeout(() => {
            const result = parseTextData(textInput);
            if (result.error) {
                setError(result.error);
            } else if (result.data.length === 0) {
                setError("入力されたテキストから構造化されたデータが見つかりませんでした。");
            } else {
                onDataLoaded({
                    ...result,
                    fileName: 'Clipboard Import'
                });
            }
            setIsLoading(false);
        }, 500);
    };

    return (
        <div className={styles.container}>
            {/* File Upload Section */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">1. データの取り込み</h2>
                <a
                    href="https://docs.google.com/spreadsheets/d/1YPyuljT5Osr11mhLOFxbRgHJQxzY64EJ/export?format=csv"
                    className="flex items-center gap-1 text-sm text-[hsl(var(--primary))] hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Download size={14} />
                    サンプルCSVのダウンロード
                </a>
            </div>

            <Card className="mb-8">
                <CardContent className="p-6">
                    <Dropzone
                        onFilesAccepted={(files) => handleFileDrop(files as File[])}
                        accept={['.xlsx', '.csv', '.tsv', '.txt']}
                        label="Excel または CSVファイルを選択"
                        subLabel="クリック、またはファイルをここにドラッグ＆ドロップしてください"
                    />
                    {isLoading && <p className="mt-4 text-center text-sm text-[hsl(var(--muted-foreground))] flex items-center justify-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> 処理中...</p>}
                    {error && <p className={styles.error}>{error}</p>}
                </CardContent>
            </Card>

            <div className={styles.divider}>
                <span>または</span>
            </div>

            {/* Text / Clipboard Section */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        テキストを直接貼り付け
                    </h3>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <textarea
                            className={styles.textarea}
                            placeholder="Excelのデータ、CSV、またはフリーテキストを貼り付けてください (例: 'WBC 12.3 (2026-02-01)')"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 text-xs bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200"
                            onClick={handlePaste}
                            title="クリップボードから貼り付け"
                            type="button"
                        >
                            <Clipboard size={14} className="mr-1" /> 貼り付け (Paste)
                        </Button>
                    </div>

                    <div className={styles.actions}>
                        <Button
                            onClick={handleTextSubmit}
                            disabled={!textInput.trim() || isLoading}
                        >
                            テキストを処理して進む <ArrowRight size={16} className="ml-2" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
