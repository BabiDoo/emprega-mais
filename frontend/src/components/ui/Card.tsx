import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ hover = false, className, children, ...props }) => (
  <div
    className={cn(
      'rounded-2xl bg-white shadow-card p-6',
      hover && 'cursor-pointer hover:shadow-card-hover transition-shadow duration-200',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
