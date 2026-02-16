import React from 'react';
import { clsx } from 'clsx';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', icon = false, children, ...props }, ref) => {

        const rootClass = clsx(
            styles.button,
            styles[variant],
            styles[size],
            icon && styles.icon,
            className
        );

        return (
            <button
                ref={ref}
                className={rootClass}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
