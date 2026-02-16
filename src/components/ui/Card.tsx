import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { }

export const Card = ({ children, className = '', ...props }: CardProps) => (
    <div className={`${styles.card} ${className}`} {...props}>
        {children}
    </div>
);

export const CardHeader = ({ children, className = '', ...props }: CardProps) => (
    <div className={`${styles.header} ${className}`} {...props}>
        {children}
    </div>
);

export const CardContent = ({ children, className = '', ...props }: CardProps) => (
    <div className={`${styles.content} ${className}`} {...props}>
        {children}
    </div>
);

export const CardFooter = ({ children, className = '', ...props }: CardProps) => (
    <div className={`${styles.footer} ${className}`} {...props}>
        {children}
    </div>
);
