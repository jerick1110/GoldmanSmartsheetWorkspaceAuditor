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
        if (!apiKey) {
            setError('API Key is required.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setWorkspaceDetails([]);
        setFilters({});
        setSortConfig(null);
        // Reset report state
        setIsReportPanelVisible(false);
        setReportContent('');
        setReportError(null);


        try {
            const data = await processAllWorkspaces(apiKey);
            setWorkspaceDetails(data);
        } catch (err) {
            if (err instanceof Error) {
                let friendlyMessage = `Failed to fetch data: ${err.message}.`;
                if (err.message.toLowerCase().includes('failed to fetch')) {
                    friendlyMessage += " This may be due to a network issue or the public CORS proxy being temporarily unavailable. Please check your connection and try again.";
                } else {
                    friendlyMessage += " Please check your API key and network connection.";
                }
                setError(friendlyMessage);
            } else {
                setError('An unknown error occurred.');
            }
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
            1.  **Overall Summary:** Provide key metrics like the total number of workspaces, unique owners, and total shared members.
            2.  **Collaboration Hotspots:** Identify workspaces with the highest number of members and owners who manage the most workspaces.
            3.  **Potential Risks & Recommendations:** Highlight potential security or management risks (e.g., workspaces with many admins, single points of failure where one owner controls many critical items) and provide specific, actionable recommendations to improve management.
            4.  **Data Hygiene Suggestions:** Offer tips for organizing and cleaning up the workspaces based on the data provided.

            Here is the data in JSON format:
            ${JSON.stringify(workspaceDetails, null, 2)}
        `;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: "You are an expert Smartsheet administrator and data analyst. Your task is to analyze JSON data of Smartsheet workspaces and generate a helpful, well-structured management report.",
                }
            });
            setReportContent(response.text);
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
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
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
                    <h1 className="text-5xl font-bold tracking-wider text-amber-400">GOLDMAN</h1>
                    <p className="mt-2 text-lg text-blue-600 dark:text-blue-400">Smartsheet Workspace Explorer</p>
                </header>

                <main className="bg-white dark:bg-blue-900 rounded-lg shadow-lg border border-blue-200 dark:border-blue-800 p-6 sm:p-8">
                    <div className="flex flex-col md:flex-row gap-4 items-start mb-6 pb-6 border-b border-blue-200 dark:border-blue-700">
                        <div className="flex-grow w-full">
                           <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
                        </div>
                        <Button onClick={handleFetchData} disabled={isLoading} className="w-full md:w-auto">
                            {isLoading ? 'Fetching...' : 'Fetch Details'}
                        </Button>
                    </div>

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center p-8">
                           <LoadingSpinner />
                           <p className="mt-4 text-lg font-medium text-blue-600 dark:text-blue-400">Fetching workspace data... this may take a moment.</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-800 dark:text-red-300 p-4 rounded-md" role="alert">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    )}
                    
                    <div>
                        {!isLoading && workspaceDetails.length > 0 && (
                            <div>
                                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                                    <FilterControls filters={filters} setFilters={setFilters} />
                                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-shrink-0">
                                        <Button 
                                            onClick={handleGenerateReport}
                                            variant="secondary" 
                                            className="w-full sm:w-auto" 
                                        >
                                            {isReportLoading ? 'Generating...' : 'Generate Report'}
                                        </Button>
                                        <Button 
                                            onClick={handleDownloadExcel} 
                                            variant="secondary" 
                                            className="w-full sm:w-auto"
                                            disabled={filteredAndSortedData.length === 0}
                                        >
                                            Download as Excel
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

                                <WorkspaceTable data={filteredAndSortedData} requestSort={requestSort} sortConfig={sortConfig} />
                            </div>
                        )}

                         {!isLoading && !error && workspaceDetails.length === 0 && (
                            <div className="text-center py-10 px-6 bg-blue-50/50 dark:bg-blue-800/50 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700">
                               <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="mt-2 text-lg font-medium text-blue-900 dark:text-white">No Data Available</h3>
                                <p className="mt-1 text-sm text-blue-500 dark:text-blue-400">Enter an API key and click "Fetch Details" to view workspace information.</p>
                            </div>
                        )}
                    </div>
                </main>
                <footer className="text-center mt-8 text-sm text-blue-500 dark:text-blue-400">
                    <p>&copy; {new Date().getFullYear()} GOLDMAN | Smartsheet Workspace Explorer</p>
                </footer>
            </div>
        </div>
    );
};

export default App;