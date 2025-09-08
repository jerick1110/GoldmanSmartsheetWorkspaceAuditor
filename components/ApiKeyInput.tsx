import React, { useState } from 'react';

interface ApiKeyInputProps {
    apiKey: string;
    setApiKey: (key: string) => void;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ apiKey, setApiKey }) => {
    const [isKeyVisible, setIsKeyVisible] = useState(false);

    const toggleVisibility = () => {
        setIsKeyVisible(!isKeyVisible);
    };

    return (
        <div className="w-full">
            <label htmlFor="api-key" className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                Smartsheet API Key
            </label>
            <div className="relative rounded-md shadow-sm">
                <input
                    type={isKeyVisible ? 'text' : 'password'}
                    id="api-key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="block w-full px-4 py-2 pr-10 text-blue-900 dark:text-blue-200 bg-white dark:bg-blue-800 border border-blue-300 dark:border-blue-600 rounded-md focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition duration-150 ease-in-out"
                    placeholder="Enter your Smartsheet API key"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                        type="button"
                        onClick={toggleVisibility}
                        className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 focus:outline-none"
                        aria-label={isKeyVisible ? "Hide API key" : "Show API key"}
                    >
                        {isKeyVisible ? (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2 2 0 012.828 2.828l1.515 1.515A4 4 0 0014 10a4 4 0 10-5.432-3.432z" clipRule="evenodd" />
                                <path d="M10 17a9.95 9.95 0 01-4.542-1.074l-1.473 1.473a1 1 0 11-1.414-1.414l14-14a1 1 0 111.414 1.414l-1.473 1.473A10.014 10.014 0 01.458 10C1.732 14.057 5.522 17 10 17z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
            <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">Your API key is used only for requests from your browser and is not stored.</p>
        </div>
    );
};

export default ApiKeyInput;