import { useState } from 'react';
import { FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { Button } from './components/ui/Button';
import { DataImport } from './pages/DataImport';
import { ColumnMappingPage } from './pages/ColumnMapping';
import { FigureCreator } from './pages/FigureCreator';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { ParseResult } from './utils/dataParser';
import type { ColumnMapping } from './types';
import styles from './App.module.css';

type Step = 'import' | 'mapping' | 'visualize';

function App() {
  const [step, setStep] = useState<Step>('import');
  const [importedData, setImportedData] = useState<ParseResult | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

  const handleDataLoaded = (result: ParseResult) => {
    setImportedData(result);
    setStep('mapping');
  };

  const handleMappingsConfirmed = (mappings: ColumnMapping[]) => {
    setColumnMappings(mappings);
    setStep('visualize');
  };

  const handleReset = () => {
    setStep('import');
    setImportedData(null);
    setColumnMappings([]);
  };

  return (
    <ErrorBoundary>
      <div className={styles.root}>
        <header className={styles.header}>
          <div className={styles.headerContainer}>
            <div className={styles.titleGroup}>
              {step !== 'import' && (
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <ArrowLeft style={{ width: '1rem', height: '1rem', marginRight: '0.25rem' }} /> New File
                </Button>
              )}
              <h1 className={styles.title}>
                <FileSpreadsheet style={{ width: '2rem', height: '2rem', stroke: 'hsl(var(--primary))' }} />
                MedFigCreate
              </h1>
            </div>
            {/* Step indicator */}
            <div className={styles.stepIndicator}>
              <span className={step === 'import' ? styles.stepActive : styles.stepDone}>① Import</span>
              <span className={styles.stepArrow}>›</span>
              <span className={step === 'mapping' ? styles.stepActive : step === 'visualize' ? styles.stepDone : styles.stepInactive}>② Mapping</span>
              <span className={styles.stepArrow}>›</span>
              <span className={step === 'visualize' ? styles.stepActive : styles.stepInactive}>③ Figure</span>
            </div>
          </div>
        </header>

        <main className={styles.main}>
          {step === 'import' && (
            <DataImport onDataLoaded={handleDataLoaded} />
          )}

          {step === 'mapping' && importedData && (
            <ColumnMappingPage
              data={importedData}
              onBack={() => setStep('import')}
              onNext={handleMappingsConfirmed}
            />
          )}

          {step === 'visualize' && importedData && (
            <FigureCreator
              rawData={importedData}
              mappings={columnMappings}
              onBack={() => setStep('mapping')}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
