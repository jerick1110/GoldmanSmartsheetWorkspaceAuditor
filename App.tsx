
import React, { useState, useCallback, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { WorkspaceDetails } from './types';
import { processAllWorkspaces } from './services/smartsheetService';
import ApiKeyInput from './components/ApiKeyInput';
import WorkspaceTable from './components/WorkspaceTable';
import Button from './components/Button';
import LoadingSpinner from './components/LoadingSpinner';
import FilterControls from './components/FilterControls';
import InsightsPanel from './components/InsightsPanel';

// Make SheetJS library available from window object
declare const XLSX: any;

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string>('');
    const [workspaceDetails, setWorkspaceDetails] = useState<WorkspaceDetails[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<Partial<Record<keyof WorkspaceDetails, string>>>({});
    const [sortConfig, setSortConfig] = useState<{ key: keyof WorkspaceDetails; direction: 'ascending' | 'descending' } | null>(null);

    const [isReportPanelVisible, setIsReportPanelVisible] = useState<boolean>(false);
    const [reportContent, setReportContent] = useState<string>('');
    const [isReportLoading, setIsReportLoading] = useState<boolean>(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const handleFetchData = useCallback(async () => {
        if (!apiKey || apiKey.trim() === '') {
            setError('Smartsheet API Key is required to begin the audit.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Initializing Audit...');
        setError(null);
        setWorkspaceDetails([]);
        setFilters({});
        setSortConfig(null);
        setIsReportPanelVisible(false);

        try {
            const data = await processAllWorkspaces(apiKey.trim(), (msg) => {
                setLoadingMessage(msg);
            });
            
            if (data.length === 0) {
                setError('No workspaces were found for this account.');
            } else {
                setWorkspaceDetails(data);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown communication error occurred.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [apiKey]);

    const handleGenerateReport = useCallback(async () => {
        if (workspaceDetails.length === 0) return;
        
        setIsReportPanelVisible(true);
        setIsReportLoading(true);
        setReportContent('');
        setReportError(null);

        const prompt = `
            Analyze the following Smartsheet workspace audit data and generate a professional management report.
            The data contains ${workspaceDetails.length} workspaces. 
            Focus on identifying security risks (e.g., broad permissions), orphaned workspaces, and collaboration patterns.
            
            Data: ${JSON.stringify(workspaceDetails)}
        `;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: {
                    systemInstruction: "You are a senior IT Auditor and Smartsheet Governance Expert. Provide strategic recommendations and highlight anomalies in the workspace permission data.",
                    thinkingConfig: { thinkingBudget: 2000 }
                }
            });
            setReportContent(response.text || 'The AI was unable to generate a report for this data set.');
        } catch (err) {
             const errorMessage = err instanceof Error ? err.message : 'Analysis service temporarily unavailable.';
             setReportError(`Failed to generate report: ${errorMessage}`);
        } finally {
            setIsReportLoading(false);
        }

    }, [workspaceDetails]);

    const filteredAndSortedData = useMemo(() => {
        let filteredData = [...workspaceDetails];
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                filteredData = filteredData.filter(item =>
                    String(item[key as keyof WorkspaceDetails] || '').toLowerCase().includes(String(value).toLowerCase())
                );
            }
        });
        if (sortConfig !== null) {
            filteredData.sort((a, b) => {
                const aVal = String(a[sortConfig.key] || '').toLowerCase();
                const bVal = String(b[sortConfig.key] || '').toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filteredData;
    }, [workspaceDetails, filters, sortConfig]);

    const requestSort = (key: keyof WorkspaceDetails) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleDownloadExcel = useCallback(() => {
        if (filteredAndSortedData.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(filteredAndSortedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Workspace Audit");
        XLSX.writeFile(workbook, "smartsheet_governance_audit.xlsx");
    }, [filteredAndSortedData]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
            <div className="w-full max-w-screen-2xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-6xl font-black tracking-tighter text-amber-500 drop-shadow-md">GOLDMAN</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.3em]">Governance & Audit Suite</p>
                </header>

                <main className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10">
                    <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-end mb-10 pb-10 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex-grow w-full">
                           <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
                        </div>
                        <Button onClick={handleFetchData} disabled={isLoading} className="w-full lg:w-64 h-12 shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all">
                            {isLoading ? 'Scanning Account...' : 'Execute Full Audit'}
                        </Button>
                    </div>

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-20 space-y-6">
                           <LoadingSpinner />
                           <div className="text-center">
                                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{loadingMessage}</p>
                                <p className="text-sm text-slate-500 mt-2">Checking multiple pages of workspaces (max 1000 items per request)...</p>
                           </div>
                        </div>
                    )}
                    
                    {error && (
                        <div className="mb-8 bg-red-50 dark:bg-red-950/30 border-l-8 border-red-600 text-red-900 dark:text-red-100 p-6 rounded-2xl shadow-sm animate-in fade-in duration-300" role="alert">
                            <div className="flex items-start">
                                <svg className="h-8 w-8 mr-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <p className="font-black text-xl mb-1 uppercase tracking-tight">Security Alert / Connection Error</p>
                                    <p className="text-sm leading-relaxed mb-4 font-medium">{error}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                        <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-red-200 dark:border-red-900">
                                            <h4 className="font-bold text-xs uppercase mb-1">CORS / Network Issues</h4>
                                            <p className="text-xs opacity-90">Disable <strong>Ad-Blockers</strong> or VPNs. These often target CORS proxies thinking they are trackers.</p>
                                        </div>
                                        <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-red-200 dark:border-red-900">
                                            <h4 className="font-bold text-xs uppercase mb-1">Access Issues (403)</h4>
                                            <p className="text-xs opacity-90">Confirm your API token has <strong>Admin</strong> or <strong>Owner</strong> level visibility for the workspaces you want to audit.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {!isLoading && workspaceDetails.length > 0 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div className="flex-grow w-full">
                                    <FilterControls filters={filters} setFilters={setFilters} />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                                    <Button 
                                        onClick={handleGenerateReport}
                                        variant="secondary" 
                                        className="w-full sm:w-auto font-black" 
                                    >
                                        {isReportLoading ? 'Auditing with Gemini...' : 'Generate AI Summary'}
                                    </Button>
                                    <Button 
                                        onClick={handleDownloadExcel} 
                                        variant="secondary" 
                                        className="w-full sm:w-auto font-black"
                                        disabled={filteredAndSortedData.length === 0}
                                    >
                                        Export Detailed Audit (XLSX)
                                    </Button>
                                </div>
                            </div>
                            
                            {isReportPanelVisible && (
                                <InsightsPanel
                                    insights={reportContent}
                                    isLoading={isReportLoading}
                                    error={reportError}
                                    onClose={() => setIsReportPanelVisible(false)}
                                />
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center">
                                        <span className="w-2 h-6 bg-amber-500 mr-3 rounded-full"></span>
                                        Audit Records
                                    </h2>
                                    <div className="px-5 py-2 bg-amber-500 text-white text-[10px] font-black rounded-full shadow-lg">
                                        RECORDS FOUND: {workspaceDetails.length}
                                    </div>
                                </div>
                                <WorkspaceTable data={filteredAndSortedData} requestSort={requestSort} sortConfig={sortConfig} />
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && workspaceDetails.length === 0 && (
                        <div className="text-center py-32 px-10 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-4 border-dashed border-slate-200 dark:border-slate-700">
                           <div className="relative inline-block mb-6">
                               <svg className="h-20 w-20 text-slate-200 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                <div className="absolute -top-2 -right-2 bg-amber-500 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900"></div>
                           </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">GOLDMAN Terminal Online</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">System ready for large-scale permission analysis. Please provide a valid Smartsheet API token to generate a governance report.</p>
                        </div>
                    )}
                </main>
                <footer className="text-center mt-12 py-10 border-t border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">
                    GOLDMAN | Governance Engine 3.1 | High Performance Auditing
                </footer>
            </div>
        </div>
    );
};

export default App;
