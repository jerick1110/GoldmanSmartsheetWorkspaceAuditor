import React from 'react';
import { WorkspaceDetails } from '../types';

interface WorkspaceTableProps {
    data: WorkspaceDetails[];
    requestSort: (key: keyof WorkspaceDetails) => void;
    sortConfig: { key: keyof WorkspaceDetails; direction: 'ascending' | 'descending' } | null;
}

const SortIcon: React.FC<{ direction?: 'ascending' | 'descending' }> = ({ direction }) => {
    if (!direction) return null;
    return (
        <svg
            className="w-4 h-4 ml-2 inline-block"
            aria-hidden="true"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
        >
            {direction === 'ascending' ? (
                <path
                    fillRule="evenodd"
                    d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                    clipRule="evenodd"
                />
            ) : (
                <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                />
            )}
        </svg>
    );
};


const WorkspaceTable: React.FC<WorkspaceTableProps> = ({ data, requestSort, sortConfig }) => {
    const tableHeaders: { key: keyof WorkspaceDetails; label: string }[] = [
        { key: 'workspaceName', label: 'Workspace Name' },
        { key: 'owner', label: 'Owner' },
        { key: 'members', label: 'Members' },
        { key: 'permissions', label: 'Permissions' },
    ];
    
    return (
        <div className="overflow-x-auto rounded-lg border border-blue-200 dark:border-blue-700">
            <table className="min-w-full divide-y divide-blue-200 dark:divide-blue-700">
                <thead className="bg-blue-100 dark:bg-blue-800">
                    <tr>
                        {tableHeaders.map(({ key, label }) => (
                            <th key={key} scope="col" className="px-6 py-3 text-left text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-wider">
                                <button
                                    type="button"
                                    onClick={() => requestSort(key)}
                                    className="flex items-center uppercase font-semibold focus:outline-none focus:text-amber-400"
                                >
                                    {label}
                                    <SortIcon direction={sortConfig?.key === key ? sortConfig.direction : undefined} />
                                </button>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-blue-900 divide-y divide-blue-200 dark:divide-blue-700">
                    {data.map((item, index) => (
                        <tr key={index} className="hover:bg-blue-50 dark:hover:bg-blue-800/50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-900 dark:text-white">
                                {item.workspaceName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500 dark:text-blue-300">
                                {item.owner}
                            </td>
                            <td className="px-6 py-4 whitespace-pre-wrap text-sm text-blue-500 dark:text-blue-300 break-words">
                                {item.members || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-pre-wrap text-sm text-blue-500 dark:text-blue-300">
                                {item.permissions || 'N/A'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default WorkspaceTable;