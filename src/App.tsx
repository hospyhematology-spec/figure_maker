import { useState } from 'react';
import { AreaChart, Table, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Card, CardContent } from './components/ui/Card';
import { DataImport } from './pages/DataImport';
import { ColumnMappingPage } from './pages/ColumnMapping';
import { FigureCreator } from './pages/FigureCreator';
import type { ParseResult } from './utils/dataParser';
import type { ColumnMapping } from './types';
import styles from './App.module.css';


// Since we have no clsx, simple string concat
const join = (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' ');

type AppMode = 'home' | 'figure' | 'table';
type Step = 'import' | 'mapping' | 'visualize';

function App() {
  const [mode, setMode] = useState<AppMode>('home');
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

  const handleBackToHome = () => {
    setMode('home');
    setStep('import');
    setImportedData(null);
    setColumnMappings([]);
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.titleGroup}>
            {mode !== 'home' && step === 'import' && (
              <Button variant="ghost" size="sm" onClick={handleBackToHome} className="mr-2">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            <h1 className={styles.title}>
              <FileSpreadsheet className="w-8 h-8 text-[hsl(var(--primary))]" style={{ stroke: 'hsl(var(--primary))' }} />
              MedFigCreate
            </h1>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {mode === 'home' && (
          <div className={styles.homeGrid}>
            <Card
              className={join(styles.cardHover, styles.cardHoverPrimary)}
              onClick={() => { setMode('figure'); setStep('import'); }}
            >
              <CardContent className={styles.cardInner}>
                <div className={styles.iconWrapper} style={{ backgroundColor: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))' }}>
                  <AreaChart className="w-12 h-12" size={48} />
                </div>
                <h2 className={styles.homeTitle}>Create Figure</h2>
                <p className={styles.homeDesc}>
                  Import and visualize medical data.
                </p>
              </CardContent>
            </Card>

            <Card
              className={join(styles.cardHover, styles.cardHoverChart)}
              onClick={() => { setMode('table'); setStep('import'); }}
            >
              <CardContent className={styles.cardInner}>
                <div className={styles.iconWrapper} style={{ backgroundColor: 'hsla(var(--chart-3), 0.1)', color: 'hsl(var(--chart-3))' }}>
                  <Table className="w-12 h-12" size={48} />
                </div>
                <h2 className={styles.homeTitle}>Create Table</h2>
                <p className={styles.homeDesc}>
                  Organize data into formatted tables.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {mode === 'figure' && step === 'import' && (
          <DataImport onDataLoaded={handleDataLoaded} />
        )}

        {mode === 'figure' && step === 'mapping' && importedData && (
          <ColumnMappingPage
            data={importedData}
            onBack={() => setStep('import')}
            onNext={handleMappingsConfirmed}
          />
        )}

        {mode === 'figure' && step === 'visualize' && importedData && (
          <FigureCreator
            rawData={importedData}
            mappings={columnMappings}
            onBack={() => setStep('mapping')}
          />
        )}

        {mode === 'table' && (
          <div className={styles.placeholder}>
            <h2 className={styles.placeholderTitle}>Table Creator</h2>
            <p>Module coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
