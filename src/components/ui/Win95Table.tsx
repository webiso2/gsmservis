import React from 'react';
import { cn } from "@/lib/utils";

interface Win95TableProps {
    headers: string[];
    children: React.ReactNode;
    className?: string;
}

const Win95Table: React.FC<Win95TableProps> = ({ headers, children, className }) => {
    return (
        <div className={cn("win95-inset bg-white overflow-auto", className)}>
            <table className="w-full text-xs sm:text-sm">
                <thead className="bg-[#000080] text-white sticky top-0">
                    <tr>
                        {headers.map((header, index) => (
                            <th key={index} className="px-2 py-2 text-left">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#c0c0c0]">
                    {children}
                </tbody>
            </table>
        </div>
    );
};

interface Win95TableRowProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
}

export const Win95TableRow: React.FC<Win95TableRowProps> = ({ children, onClick, className }) => {
    return (
        <tr
            onClick={onClick}
            className={cn(
                "hover:bg-gray-100",
                onClick && "cursor-pointer",
                className
            )}
        >
            {children}
        </tr>
    );
};

interface Win95TableCellProps {
    children: React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
}

export const Win95TableCell: React.FC<Win95TableCellProps> = ({ children, className, align = 'left' }) => {
    return (
        <td className={cn(
            "px-2 py-1.5",
            align === 'center' && "text-center",
            align === 'right' && "text-right",
            className
        )}>
            {children}
        </td>
    );
};

export default Win95Table;
