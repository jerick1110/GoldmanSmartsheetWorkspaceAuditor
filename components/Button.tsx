import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'icon';
}

const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center border text-base font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-50 dark:focus:ring-offset-blue-950 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        primary: 'px-6 py-2 text-blue-950 bg-amber-400 border-transparent hover:bg-amber-500 focus:ring-amber-500',
        secondary: 'px-6 py-2 text-amber-400 bg-transparent border-amber-400 hover:bg-amber-400/10 focus:ring-amber-500',
        icon: 'p-2 border-transparent text-amber-400 hover:bg-amber-400/10 focus:ring-amber-500 rounded-full'
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;