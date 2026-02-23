import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supportService, type SmartSuggestion } from '@/services/support.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Wand2, ChevronDown, ChevronUp, Loader2, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmartSuggestionsPanelProps {
    ticketId: number
    onSelectSuggestion: (message: string) => void
    className?: string
}

export function SmartSuggestionsPanel({ ticketId, onSelectSuggestion, className }: SmartSuggestionsPanelProps) {
    const { t } = useTranslation()
    const [isExpanded, setIsExpanded] = useState(true)
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

    const { data: suggestionsData, isLoading } = useQuery({
        queryKey: ['ticket-suggestions', ticketId],
        queryFn: () => supportService.getSuggestions(ticketId),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })

    const suggestions = suggestionsData?.data?.suggestions || []

    const handleCopy = (message: string, index: number) => {
        navigator.clipboard.writeText(message)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
    }

    const handleSelect = (message: string) => {
        onSelectSuggestion(message)
    }

    return (
        <Card className={cn('transition-all duration-300', className)}>
            <CardHeader
                className="py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        {t('support.smartSuggestions', 'Smart Suggestions')}
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            AI
                        </span>
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="pt-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4 gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                            <span className="text-sm text-muted-foreground">
                                {t('support.generatingSuggestions', 'Generating suggestions...')}
                            </span>
                        </div>
                    ) : (
                        <div className="max-h-64 overflow-y-auto">
                            <div className="space-y-2">
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="group p-3 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all cursor-pointer"
                                        onClick={() => handleSelect(suggestion.message)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                                                    <Wand2 className="h-3 w-3 text-amber-500" />
                                                    {suggestion.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {suggestion.message}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleCopy(suggestion.message, index)
                                                }}
                                            >
                                                {copiedIndex === index ? (
                                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {suggestions.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        {t('support.noSuggestions', 'No suggestions available')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-3 text-center">
                        {t('support.clickToUse', 'Click a suggestion to use it')}
                    </p>
                </CardContent>
            )}
        </Card>
    )
}
