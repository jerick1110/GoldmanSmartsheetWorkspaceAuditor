import React from 'react';
import { WorkspaceDetails } from '../types';

interface FilterControlsProps {
    filters: Partial<Record<keyof WorkspaceDetails, string>>;
    setFilters: React.Dispatch<React.SetStateAction<Partial<Record<keyof WorkspaceDetails, string>>>>;
}

const FilterInput: React.FC<{
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ placeholder, value, onChange }) => (
    <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="block w-full px-3 py-1.5 text-sm text-blue-900 dark:text-blue-200 bg-white dark:bg-blue-800 border border-blue-300 dark:border-blue-600 rounded-md focus:ring-amber-500 focus:border-amber-500 transition duration-150 ease-in-out"
    />
);


const FilterControls: React.FC<FilterControlsProps> = ({ filters, setFilters }) => {
    const handleFilterChange = (column: keyof WorkspaceDetails, value: string) => {
        setFilters(prev => ({ ...prev, [column]: value }));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <FilterInput
                placeholder="Filter by name..."
                value={filters.workspaceName || ''}
                onChange={(e) => handleFilterChange('workspaceName', e.target.value)}
            />
            <FilterInput
                placeholder="Filter by owner..."
                value={filters.owner || ''}
                onChange={(e) => handleFilterChange('owner', e.target.value)}
            />
            <FilterInput
                placeholder="Filter by members..."
                value={filters.members || ''}
                onChange={(e) => handleFilterChange('members', e.target.value)}
            />
        </div>
    );
};

export default FilterControls;