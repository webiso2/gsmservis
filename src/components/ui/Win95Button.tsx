import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Win95ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

const Win95Button: React.FC<Win95ButtonProps> = ({
    className,
    variant = 'default',
    isLoading = false,
    icon,
    children,
    disabled,
    ...props
}) => {
    return (
        <Button
            className={cn(
                "win95-button active:translate-y-px active:shadow-none",
                variant === 'destructive' && "bg-red-600 text-white hover:bg-red-700",
                variant === 'outline' && "bg-[#c0c0c0] text-black border-2 border-white border-b-black border-r-black",
                variant === 'ghost' && "hover:bg-gray-200 shadow-none border-none",
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon && <span className="mr-2">{icon}</span>}
            {children}
        </Button>
    );
};

export default Win95Button;
