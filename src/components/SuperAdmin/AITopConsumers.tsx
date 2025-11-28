'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, TrendingUp, Zap } from 'lucide-react';
import type { AITopConsumer } from '@/types/super-admin';

interface AITopConsumersProps {
  consumers: AITopConsumer[];
  loading?: boolean;
}

const formatNumber = (value: number) => {
  return value.toLocaleString('en-US');
};

const formatCost = (value: number) => {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return 'text-yellow-500 dark:text-yellow-400';
    case 2:
      return 'text-gray-400 dark:text-gray-500';
    case 3:
      return 'text-amber-600 dark:text-amber-700';
    default:
      return 'text-muted-foreground';
  }
};

const LoadingRow = () => (
  <TableRow>
    <TableCell className="w-12"><Skeleton className="h-4 w-8" /></TableCell>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
    <TableCell className="text-right hidden lg:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
  </TableRow>
);

export function AITopConsumers({ consumers, loading = false }: AITopConsumersProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Avg Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <LoadingRow key={i} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!consumers || consumers.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
        <div className="mx-auto max-w-md">
          <div className="mb-4 text-muted-foreground">
            <TrendingUp className="mx-auto h-24 w-24" strokeWidth={1} />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No consumption data</h3>
          <p className="text-sm text-muted-foreground">
            No AI usage data available for the selected period
          </p>
        </div>
      </div>
    );
  }

  // Calculate max tokens for progress bar
  const maxTokens = Math.max(...consumers.map(c => c.total_tokens));

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Top AI Consumers</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Top 10 tenants by token usage
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Zap className="h-4 w-4" />
                  Tokens
                </div>
              </TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Avg Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consumers.map((consumer, index) => {
              const rank = index + 1;
              const tokenPercentage = (consumer.total_tokens / maxTokens) * 100;

              return (
                <TableRow key={consumer.tenant_id}>
                  {/* Rank */}
                  <TableCell className="w-12">
                    <div className={`font-bold ${getRankColor(rank)}`}>
                      {rank <= 3 ? (
                        <div className="flex items-center justify-center">
                          <Trophy className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="text-center">{rank}</div>
                      )}
                    </div>
                  </TableCell>

                  {/* Tenant */}
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium">{consumer.business_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {consumer.subdomain}
                      </div>
                    </div>
                  </TableCell>

                  {/* Tokens with Progress Bar */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="font-mono font-semibold">
                        {formatNumber(consumer.total_tokens)}
                      </div>
                      <div className="w-full max-w-[120px] h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-600 dark:bg-teal-500 transition-all"
                          style={{ width: `${tokenPercentage}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>

                  {/* Cost */}
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="font-mono bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                    >
                      {formatCost(consumer.total_cost)}
                    </Badge>
                  </TableCell>

                  {/* Avg Latency */}
                  <TableCell className="text-right hidden lg:table-cell">
                    <div className="font-mono text-sm">
                      {consumer.avg_latency.toFixed(0)}ms
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
