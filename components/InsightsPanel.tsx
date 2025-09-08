import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import LoadingSpinner from './LoadingSpinner';

interface InsightsPanelProps {
    insights: string;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights, isLoading, error, onClose }) => {
    return (
        <div className="relative bg-blue-100/50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-6 my-6">
            <button
                onClick={onClose}
                className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 focus:outline-none"
                aria-label="Close report panel"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 className="text-xl font-bold mb-4 text-amber-400">Workspace Management Report</h3>
            {isLoading && (
                <div className="flex flex-col items-center justify-center p-8">
                   <LoadingSpinner />
                   <p className="mt-4 text-lg font-medium text-blue-600 dark:text-blue-400">Analyzing data and generating report...</p>
                </div>
            )}
            {error && (
                 <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-800 dark:text-red-300 p-4 rounded-md" role="alert">
                    <p className="font-bold">Error Generating Report</p>
                    <p>{error}</p>
                </div>
            )}
            {!isLoading && insights && (
                 <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-amber-400 prose-strong:text-blue-900 dark:prose-strong:text-blue-100 prose-p:text-blue-800 dark:prose-p:text-blue-200 prose-ul:text-blue-800 dark:prose-ul:text-blue-200 prose-ol:text-blue-800 dark:prose-ol:text-blue-200">
                     <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                     >
                        {insights}
                     </ReactMarkdown>
                 </div>
            )}
        </div>
    );
};

export default InsightsPanel;