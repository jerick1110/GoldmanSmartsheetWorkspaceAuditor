import React from 'react';

const LoadingSpinner: React.FC = () => {
    return (
        <div className="w-12 h-12 border-4 border-amber-400 border-solid border-t-transparent rounded-full animate-spin"></div>
    );
};

export default LoadingSpinner;