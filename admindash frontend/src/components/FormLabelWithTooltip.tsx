
import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils' // Assuming cn utility is available and imported from here

interface FormLabelWithTooltipProps {
    htmlFor: string
    label: string
    tooltip: string
    required?: boolean
    className?: string
    labelClassName?: string
}

export function FormLabelWithTooltip({ htmlFor, label, tooltip, required, className, labelClassName }: FormLabelWithTooltipProps) {
    return (
        <div className={cn("flex items-center gap-1.5 mb-1.5", className)}>
            <Label htmlFor={htmlFor} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500", labelClassName)}>
                {label}
            </Label>
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white border-slate-800">
                        <p className="max-w-xs text-xs">{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}
