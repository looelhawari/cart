import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  refundDashboardService,
  type RefundFilters,
  type RefundRecord,
  type RefundStatsResponse,
  type PaginatedRefunds,
} from "@/services/refund-dashboard.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  RefreshCw,
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
  AlertCircle,
  Package,
  User,
  CreditCard,
  FileText,
  ArrowUpDown,
  ShoppingBag,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Hash,
  Calendar,
  Shield,
} from "lucide-react";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

/* ───── Status / Type Badge Components ───── */

function RefundStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    completed: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    processing: {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    pending: {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      dot: "bg-blue-500",
    },
    failed: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-700",
      dot: "bg-red-500",
    },
  };
  const c = config[status] || {
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-700",
    dot: "bg-gray-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RefundTypeBadge({ type }: { type: string }) {
  const config: Record<
    string,
    { bg: string; text: string; icon: React.ReactNode }
  > = {
    full: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    penalty: {
      bg: "bg-orange-50 border-orange-200",
      text: "text-orange-700",
      icon: <Shield className="h-3 w-3" />,
    },
    partial: {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      icon: <Package className="h-3 w-3" />,
    },
  };
  const c = config[type] || {
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-700",
    icon: null,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text}`}
    >
      {c.icon}
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

/* ───── Skeleton Components ───── */

function StatsCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-20 bg-muted animate-pulse rounded mb-2" />
        <div className="h-3 w-32 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-4 bg-muted animate-pulse rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

/* ───── Stats Card ───── */

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor || ""}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

/* ───── Detail Dialog Section ───── */

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      {children}
    </div>
  );
}

/* ───── Main Page ───── */

export default function RefundDashboardPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<RefundFilters>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(
    null,
  );
  const [showDetail, setShowDetail] = useState(false);

  // Fetch refunds list
  const {
    data: refundsData,
    isLoading,
    error: refundsError,
  } = useQuery<PaginatedRefunds>({
    queryKey: ["refund-dashboard", filters],
    queryFn: () => refundDashboardService.getRefunds(filters),
    refetchOnMount: true,
    staleTime: 0,
  });

  // Fetch stats
  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery<RefundStatsResponse>({
    queryKey: ["refund-stats"],
    queryFn: () => refundDashboardService.getStats(),
    refetchOnMount: true,
    staleTime: 0,
  });

  // Reconcile mutation
  const reconcileMutation = useMutation({
    mutationFn: () => refundDashboardService.reconcile(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["refund-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["refund-stats"] });
      toast({
        title: "Reconciliation Complete",
        description: data.message || `Reconciled ${data.reconciled} refunds`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Reconciliation Failed",
        description: err.message || "Could not reconcile stale refunds",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm, page: 1 });
  };

  const handleViewDetail = async (refundId: number) => {
    try {
      const detail = await refundDashboardService.getRefund(refundId);
      setSelectedRefund(detail);
      setShowDetail(true);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load refund details",
        variant: "destructive",
      });
    }
  };

  const handleSort = (column: string) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: column,
      sort_order:
        prev.sort_by === column && prev.sort_order === "desc" ? "asc" : "desc",
      page: 1,
    }));
  };

  // Derived data
  const refunds = refundsData?.refunds ?? [];
  const pagination = refundsData?.pagination;
  const stats = statsData?.stats;

  const SortableHeader = ({
    column,
    children,
  }: {
    column: string;
    children: React.ReactNode;
  }) => (
    <th
      className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => handleSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown
          className={`h-3 w-3 ${filters.sort_by === column ? "text-foreground" : "text-muted-foreground/40"}`}
        />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
            Refund Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage all card refunds and reconciliation
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => reconcileMutation.mutate()}
          disabled={reconcileMutation.isPending}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${reconcileMutation.isPending ? "animate-spin" : ""}`}
          />
          Reconcile Stale
        </Button>
      </div>

      {/* Stats Cards */}
      {isLoadingStats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      ) : statsError ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-red-400" />
            <p className="text-red-600 font-medium">
              Failed to load refund statistics
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Check your connection and try again
            </p>
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Refunds"
            value={Number(stats.total_refunds) || 0}
            subtitle={`${formatCurrency(Number(stats.total_refunded_amount) || 0)} total refunded`}
            icon={DollarSign}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Completed"
            value={Number(stats.completed_refunds) || 0}
            subtitle={`Avg: ${formatCurrency(Number(stats.avg_refund_amount) || 0)}`}
            icon={CheckCircle}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            valueColor="text-emerald-600"
          />
          <StatsCard
            title="Processing"
            value={Number(stats.processing_refunds) || 0}
            subtitle="Awaiting Paymob confirmation"
            icon={Clock}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            valueColor="text-amber-600"
          />
          <StatsCard
            title="Penalties Collected"
            value={formatCurrency(Number(stats.total_penalty_collected) || 0)}
            subtitle={`${Number(stats.failed_refunds) || 0} failed refunds`}
            icon={TrendingUp}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            valueColor="text-orange-600"
          />
        </div>
      ) : null}

      {/* Filters & Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search by order #, customer, refund ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} size="icon" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Select
                value={(filters.status as string[])?.join(",") || ""}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value && value !== "all" ? [value] : undefined,
                    page: 1,
                  })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={(filters.type as string[])?.join(",") || ""}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    type: value && value !== "all" ? [value] : undefined,
                    page: 1,
                  })
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="penalty">Penalty</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.initiated_by || ""}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    initiated_by: value && value !== "all" ? value : undefined,
                    page: 1,
                  })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Initiated By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      ID
                    </th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Order
                    </th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Type
                    </th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Penalty
                    </th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      By
                    </th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : refundsError ? (
            <div className="text-center py-12 rounded-lg border border-dashed">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-400" />
              <p className="text-red-600 font-semibold">
                Failed to load refunds
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Please try again or check your connection
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["refund-dashboard"],
                  })
                }
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : refunds.length === 0 ? (
            <div className="text-center py-12 rounded-lg border border-dashed">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">
                No refunds found
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Refunds will appear here when orders are cancelled or items are
                refunded
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <SortableHeader column="id">ID</SortableHeader>
                    <SortableHeader column="order_id">Order</SortableHeader>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Type
                    </th>
                    <SortableHeader column="refund_amount">
                      Amount
                    </SortableHeader>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Penalty
                    </th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      By
                    </th>
                    <SortableHeader column="created_at">Date</SortableHeader>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((refund) => (
                    <tr
                      key={refund.id}
                      className="border-b hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => handleViewDetail(refund.id)}
                    >
                      <td className="p-3">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          #{refund.id}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {refund.order?.order_number ||
                              `#${refund.order_id}`}
                          </span>
                          {(() => {
                            const user =
                              refund.order?.user || (refund as any).user;
                            if (!user) return null;
                            const name =
                              user.name ||
                              [user.first_name, user.last_name]
                                .filter(Boolean)
                                .join(" ");
                            return name ? (
                              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {name}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td className="p-3">
                        <RefundTypeBadge type={refund.type} />
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-foreground">
                          {formatCurrency(refund.refund_amount)}
                        </span>
                      </td>
                      <td className="p-3">
                        {refund.penalty_amount > 0 ? (
                          <div className="flex flex-col">
                            <span className="text-orange-600 font-medium">
                              {formatCurrency(refund.penalty_amount)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {refund.penalty_percent}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <RefundStatusBadge status={refund.status} />
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="capitalize text-xs font-normal"
                        >
                          {refund.initiated_by}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(refund.created_at)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatDate(refund.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-60 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(refund.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing page{" "}
                <span className="font-medium text-foreground">
                  {pagination.current_page}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {pagination.last_page}
                </span>{" "}
                ({pagination.total} refunds)
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current_page === 1}
                  onClick={() =>
                    setFilters({ ...filters, page: (filters.page || 1) - 1 })
                  }
                  className="gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() =>
                    setFilters({ ...filters, page: (filters.page || 1) + 1 })
                  }
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-lg">
                    Refund #{selectedRefund?.id}
                  </DialogTitle>
                  {selectedRefund && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Created {formatRelativeTime(selectedRefund.created_at)}
                    </p>
                  )}
                </div>
              </div>
              {selectedRefund && (
                <RefundStatusBadge status={selectedRefund.status} />
              )}
            </div>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-6 mt-2">
              {/* Amount Overview Card */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-100">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Original
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(selectedRefund.original_amount)}
                    </p>
                  </div>
                  {selectedRefund.penalty_amount > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Penalty ({selectedRefund.penalty_percent}%)
                      </p>
                      <p className="text-lg font-bold text-orange-600">
                        -{formatCurrency(selectedRefund.penalty_amount)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Refunded
                    </p>
                    <p className="text-lg font-bold text-emerald-700">
                      {formatCurrency(selectedRefund.refund_amount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <DetailSection title="Refund Details" icon={CreditCard}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-muted/30 rounded-lg p-4 border">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        Type
                      </p>
                      <div className="mt-0.5">
                        <RefundTypeBadge type={selectedRefund.type} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        Method
                      </p>
                      <p className="text-sm font-medium capitalize mt-0.5">
                        {selectedRefund.refund_method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        Initiated By
                      </p>
                      <p className="text-sm font-medium capitalize mt-0.5">
                        {selectedRefund.initiated_by}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        Date
                      </p>
                      <p className="text-sm font-medium mt-0.5">
                        {formatDate(selectedRefund.created_at)}
                      </p>
                    </div>
                  </div>
                  {selectedRefund.paymob_refund_id && (
                    <div className="col-span-2 flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                          Paymob Refund ID
                        </p>
                        <p className="text-sm font-mono text-muted-foreground mt-0.5">
                          {selectedRefund.paymob_refund_id}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </DetailSection>

              {/* Order Information */}
              {selectedRefund.order && (
                <DetailSection title="Order Information" icon={ShoppingBag}>
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {selectedRefund.order.order_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Total: {formatCurrency(selectedRefund.order.total)} •{" "}
                          <span className="capitalize">
                            {selectedRefund.order.payment_method?.replace(
                              /_/g,
                              " ",
                            )}
                          </span>
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {selectedRefund.order.status?.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {/* Order Items */}
                    {selectedRefund.order.items &&
                      selectedRefund.order.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            Order Items
                          </p>
                          {(selectedRefund.order.items as any[]).map(
                            (item: any, idx: number) => {
                              const isRefunded =
                                item.refunded === true || item.refunded === 1;
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between p-2.5 rounded-lg text-sm transition-colors ${
                                    isRefunded
                                      ? "bg-red-50 border border-red-100"
                                      : "bg-white border border-gray-100"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                        isRefunded
                                          ? "bg-red-100 text-red-600"
                                          : "bg-emerald-100 text-emerald-600"
                                      }`}
                                    >
                                      {item.quantity}×
                                    </div>
                                    <div>
                                      <p
                                        className={`font-medium ${isRefunded ? "line-through text-muted-foreground" : ""}`}
                                      >
                                        {item.product_name}
                                      </p>
                                      {isRefunded && (
                                        <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
                                          Refunded
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p
                                      className={`font-semibold ${isRefunded ? "text-red-600" : ""}`}
                                    >
                                      {formatCurrency(
                                        Number(item.subtotal) ||
                                          Number(item.price) *
                                            Number(item.quantity),
                                      )}
                                    </p>
                                    {!isRefunded && item.price && (
                                      <p className="text-[10px] text-muted-foreground">
                                        {formatCurrency(Number(item.price))}{" "}
                                        each
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      )}
                  </div>
                </DetailSection>
              )}

              {/* Refunded Items (from refund record) */}
              {selectedRefund.refunded_items &&
                selectedRefund.refunded_items.length > 0 && (
                  <DetailSection title="Refunded Items" icon={XCircle}>
                    <div className="space-y-2">
                      {selectedRefund.refunded_items.map(
                        (item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-red-50/60 border border-red-100 rounded-lg p-3 text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                <XCircle className="h-4 w-4 text-red-500" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {item.product_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Qty: {item.quantity}
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold text-red-600">
                              {formatCurrency(Number(item.amount) || 0)}
                            </p>
                          </div>
                        ),
                      )}
                      <div className="flex justify-between items-center pt-2 border-t mt-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Total Refunded Items
                        </span>
                        <span className="text-sm font-bold text-red-600">
                          {formatCurrency(
                            selectedRefund.refunded_items.reduce(
                              (sum: number, item: any) =>
                                sum + (Number(item.amount) || 0),
                              0,
                            ),
                          )}
                        </span>
                      </div>
                    </div>
                  </DetailSection>
                )}

              {/* Customer Info */}
              {(selectedRefund.order?.user || (selectedRefund as any).user) &&
                (() => {
                  const user =
                    selectedRefund.order?.user || (selectedRefund as any).user;
                  const displayName =
                    user.name ||
                    [user.first_name, user.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    "—";
                  const displayEmail = user.email || "";
                  return (
                    <DetailSection title="Customer" icon={User}>
                      <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-4 border">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {displayName}
                          </p>
                          {displayEmail && (
                            <p className="text-sm text-muted-foreground">
                              {displayEmail}
                            </p>
                          )}
                          {user.phone && (
                            <p className="text-xs text-muted-foreground">
                              {user.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </DetailSection>
                  );
                })()}

              {/* Reason */}
              {selectedRefund.reason && (
                <DetailSection title="Reason" icon={FileText}>
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <p className="text-sm text-foreground leading-relaxed">
                      {selectedRefund.reason}
                    </p>
                  </div>
                </DetailSection>
              )}

              {/* Failure Reason */}
              {selectedRefund.failure_reason && (
                <DetailSection title="Failure Reason" icon={AlertCircle}>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 leading-relaxed">
                      {selectedRefund.failure_reason}
                    </p>
                  </div>
                </DetailSection>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
