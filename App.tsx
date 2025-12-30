
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
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<Partial<Record<keyof WorkspaceDetails, string>>>({});
    const [sortConfig, setSortConfig] = useState<{ key: keyof WorkspaceDetails; direction: 'ascending' | 'descending' } | null>(null);

    // New state for the Workspace Report
    const [isReportPanelVisible, setIsReportPanelVisible] = useState<boolean>(false);
    const [reportContent, setReportContent] = useState<string>('');
    const [isReportLoading, setIsReportLoading] = useState<boolean>(false);
    const [reportError, setReportError] = useState<string | null>(null);


    const handleFetchData = useCallback(async () => {
        if (!apiKey || apiKey.trim() === '') {
            setError('Smartsheet API Key is required to fetch data.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setWorkspaceDetails([]);
        setFilters({});
        setSortConfig(null);
        setIsReportPanelVisible(false);
        setReportContent('');
        setReportError(null);

        try {
            const data = await processAllWorkspaces(apiKey.trim());
            if (data.length === 0) {
                setError('No workspaces were found for this API key.');
            } else {
                setWorkspaceDetails(data);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to fetch Smartsheet data: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [apiKey]);

    const handleGenerateReport = useCallback(async () => {
        if (workspaceDetails.length === 0) {
            setReportError("No workspace data available to analyze.");
            return;
        }
        
        setIsReportPanelVisible(true);
        setIsReportLoading(true);
        setReportContent('');
        setReportError(null);

        const prompt = `
            Analyze the following Smartsheet workspace data and generate a concise management report with actionable insights. Use Markdown for clear formatting.

            The report should include these sections:
            1. **Overall Summary:** Provide key metrics like the total number of workspaces, unique owners, and total shared members.
            2. **Collaboration Hotspots:** Identify workspaces with the highest number of members and owners who manage the most workspaces.
            3. **Potential Risks & Recommendations:** Highlight potential security or management risks (e.g., workspaces with many admins, single points of failure where one owner controls many critical items) and provide specific, actionable recommendations to improve management.
            4. **Data Hygiene Suggestions:** Offer tips for organizing and cleaning up the workspaces based on the data provided.

            Data: ${JSON.stringify(workspaceDetails)}
        `;

        try {
            // Re-initialize AI client to ensure the freshest API key is used
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    systemInstruction: "You are an expert Smartsheet administrator and data analyst. Your task is to analyze JSON data of Smartsheet workspaces and generate a helpful, well-structured management report. Focus on security, collaboration, and organization.",
                }
            });
            setReportContent(response.text || 'No insights generated.');
        } catch (err) {
             const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
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
                    item[key as keyof WorkspaceDetails]?.toString().toLowerCase().includes(value.toLowerCase())
                );
            }
        });

        if (sortConfig !== null) {
            filteredData.sort((a, b) => {
                const aVal = a[sortConfig.key]?.toString().toLowerCase() || '';
                const bVal = b[sortConfig.key]?.toString().toLowerCase() || '';
                if (aVal < bVal) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
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

        const worksheet = XLSX.utils.json_to_sheet(filteredAndSortedData.map(item => ({
            "Workspace Name": item.workspaceName,
            "Owner": item.owner,
            "Members": item.members,
            "Permissions": item.permissions
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Workspaces");
        XLSX.writeFile(workbook, "smartsheet_workspaces.xlsx");
    }, [filteredAndSortedData]);

    return (
        <div className="min-h-screen bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-screen-2xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-5xl font-extrabold tracking-tight text-amber-400 drop-shadow-sm">GOLDMAN</h1>
                    <p className="mt-2 text-lg text-blue-600 dark:text-blue-400 font-medium uppercase tracking-widest">Smartsheet Workspace Explorer</p>
                </header>

                <main className="bg-white dark:bg-blue-900 rounded-2xl shadow-2xl border border-blue-100 dark:border-blue-800 p-6 sm:p-8 overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-6 items-end mb-8 pb-8 border-b border-blue-50 dark:border-blue-800">
                        <div className="flex-grow w-full">
                           <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
                        </div>
                        <Button onClick={handleFetchData} disabled={isLoading} className="w-full md:w-48 h-11">
                            {isLoading ? 'Processing...' : 'Fetch Details'}
                        </Button>
                    </div>

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4">
                           <LoadingSpinner />
                           <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 animate-pulse">Scanning workspaces... This may take a moment.</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-800 dark:text-red-300 p-6 rounded-xl shadow-inner" role="alert">
                            <div className="flex items-center">
                                <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="font-bold text-lg">Communication Error</p>
                            </div>
                            <p className="mt-2 text-sm opacity-90">{error}</p>
                        </div>
                    )}
                    
                    <div>
                        {!isLoading && workspaceDetails.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                    <div className="flex-grow w-full">
                                        <FilterControls filters={filters} setFilters={setFilters} />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-shrink-0">
                                        <Button 
                                            onClick={handleGenerateReport}
                                            variant="secondary" 
                                            className="w-full sm:w-auto font-semibold" 
                                        >
                                            {isReportLoading ? 'AI Analyzing...' : 'Generate AI Insights'}
                                        </Button>
                                        <Button 
                                            onClick={handleDownloadExcel} 
                                            variant="secondary" 
                                            className="w-full sm:w-auto font-semibold"
                                            disabled={filteredAndSortedData.length === 0}
                                        >
                                            Export to Excel
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

                                <div className="mt-4">
                                    <WorkspaceTable data={filteredAndSortedData} requestSort={requestSort} sortConfig={sortConfig} />
                                </div>
                            </div>
                        )}

                         {!isLoading && !error && workspaceDetails.length === 0 && (
                            <div className="text-center py-20 px-6 bg-blue-50/30 dark:bg-blue-800/20 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-700">
                               <svg className="mx-auto h-16 w-16 text-blue-200 dark:text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <h3 className="mt-4 text-xl font-bold text-blue-900 dark:text-white">Workspace Explorer Ready</h3>
                                <p className="mt-2 text-blue-500 dark:text-blue-400 max-w-md mx-auto">Input your Smartsheet API token above to securely audit your organization's workspaces and permissions.</p>
                            </div>
                        )}
                    </div>
                </main>
                <footer className="text-center mt-12 py-8 border-t border-blue-100 dark:border-blue-900 text-sm text-blue-400 dark:text-blue-500">
                    <p className="font-medium">&copy; {new Date().getFullYear()} GOLDMAN | Intelligence Suite</p>
                    <p className="mt-1 opacity-75">Secure Client-Side Analysis</p>
                </footer>
            </div>
        </div>
    );
};

export default App;
