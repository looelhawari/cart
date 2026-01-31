import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { cannedResponseService, type CannedResponse } from '@/services/canned-response.service'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FileText, ChevronDown, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface CannedResponseDropdownProps {
    onSelect: (content: string) => void
}

export function CannedResponseDropdown({ onSelect }: CannedResponseDropdownProps) {
    const { t } = useTranslation()
    const [search, setSearch] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    const { data: responses = [] } = useQuery({
        queryKey: ['canned-responses'],
        queryFn: () => cannedResponseService.getAll(),
        enabled: isOpen,
    })

    const filteredResponses = responses.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.content.toLowerCase().includes(search.toLowerCase()) ||
        (r.shortcut && r.shortcut.toLowerCase().includes(search.toLowerCase()))
    )

    // Group by category
    const grouped = filteredResponses.reduce((acc, response) => {
        const category = response.category || 'General'
        if (!acc[category]) acc[category] = []
        acc[category].push(response)
        return acc
    }, {} as Record<string, CannedResponse[]>)

    const handleSelect = (response: CannedResponse) => {
        onSelect(response.content)
        setIsOpen(false)
        setSearch('')
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                    <FileText className="h-4 w-4" />
                    {t('support.cannedResponses')}
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="p-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder={t('support.searchResponses')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-64 overflow-y-auto">
                    {Object.entries(grouped).length === 0 ? (
                        <div className="text-center py-4 text-gray-400 text-sm">
                            {responses.length === 0
                                ? t('support.noCannedResponses')
                                : t('support.noMatchingResponses')
                            }
                        </div>
                    ) : (
                        Object.entries(grouped).map(([category, items]) => (
                            <div key={category}>
                                <DropdownMenuLabel className="text-xs text-gray-500 uppercase">
                                    {category}
                                </DropdownMenuLabel>
                                {items.map((response) => (
                                    <DropdownMenuItem
                                        key={response.id}
                                        onClick={() => handleSelect(response)}
                                        className="flex flex-col items-start gap-1 py-2 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <span className="font-medium">{response.title}</span>
                                            {response.shortcut && (
                                                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                                                    /{response.shortcut}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400 line-clamp-2">
                                            {response.content.substring(0, 100)}...
                                        </span>
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
