import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null })
        window.location.href = '/dashboard'
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <Card className="max-w-lg w-full">
                        <CardHeader>
                            <CardTitle className="text-red-600">Something went wrong</CardTitle>
                            <CardDescription>
                                An error occurred while rendering this page
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                                <p className="font-mono text-sm text-red-800">
                                    {this.state.error?.message || 'Unknown error'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={this.handleReset}>Go to Dashboard</Button>
                                <Button variant="outline" onClick={() => window.location.reload()}>
                                    Reload Page
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
