import React, { useRef, useState, useCallback } from 'react';
import { UploadCloud, FileType } from 'lucide-react';
import styles from './Dropzone.module.css';

interface DropzoneProps {
    onFilesAccepted: (files: File[]) => void;
    accept?: string[]; // e.g. ['.xlsx', '.csv', '.tsv']
    maxFiles?: number;
    label?: string;
    subLabel?: string;
}

export const Dropzone = ({
    onFilesAccepted,
    accept = ['.xlsx', '.csv', '.tsv'],
    maxFiles = 1,
    label = "Click or drag file to this area to upload",
    subLabel = "Support for a single or bulk upload."
}: DropzoneProps) => {

    const [isDragActive, setIsDragActive] = useState(false);
    const [fileList, setFileList] = useState<File[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            validateAndAddFiles(files);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            validateAndAddFiles(files);
        }
    };

    const validateAndAddFiles = (newFiles: File[]) => {
        // Only file extension check for basic validation
        const validFiles = newFiles.filter(file => {
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            return accept.includes(ext);
        });

        if (validFiles.length > 0) {
            setFileList(prev => {
                const combined = [...prev, ...validFiles];
                // Limit file count
                const limitedObject = combined.slice(0, maxFiles);
                onFilesAccepted(limitedObject);
                return limitedObject;
            });
        } else {
            // Could add toast notification here
            console.warn("No valid files found or file type not supported.");
        }
    };

    const onButtonClick = () => {
        inputRef.current?.click();
    };

    return (
        <div
            className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
        >
            <input
                ref={inputRef}
                type="file"
                multiple={maxFiles > 1}
                onChange={handleChange}
                accept={accept.join(',')}
                style={{ display: 'none' }}
            />

            <div className={styles.iconContainer}>
                <UploadCloud size={40} strokeWidth={1.5} />
            </div>

            <p className={styles.title}>{label}</p>
            <p className={styles.subtitle}>{subLabel} (Supported: {accept.join(', ')})</p>

            {fileList.length > 0 && (
                <div className={styles.fileList} onClick={(e) => e.stopPropagation()}>
                    <h4 className="text-sm font-medium mb-2">Selected files:</h4>
                    {fileList.map((file, i) => (
                        <div key={`${file.name}-${i}`} className={styles.fileItem}>
                            <FileType size={16} />
                            <span className="truncate">{file.name}</span>
                            <span className="text-xs text-[hsl(var(--text-secondary))] ml-auto">
                                {(file.size / 1024).toFixed(1)} KB
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
