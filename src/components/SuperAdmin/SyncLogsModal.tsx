'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Download, ChevronDown, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface SyncLog {
  sync_id: string;
  integration_id: string;
  sync_status: 'completed' | 'error' | 'in_progress';
  sync_started_at: string | null;
  sync_ended_at: string | null;
  records_synced: number;
  error_message: string | null;
  created_at: string | null;
}

interface SyncLogsModalProps {
  integrationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SyncLogsModal({ integrationId, isOpen, onClose }: SyncLogsModalProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (integrationId && isOpen) {
      fetchLogs();
    }
  }, [integrationId, isOpen]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('super_admin_token');
      const response = await fetch(`/api/super-admin/integrations/${integrationId}/logs`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = () => {
    const json = JSON.stringify(logs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-logs-${integrationId}-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculateDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return 'N/A';
    try {
      const seconds = differenceInSeconds(new Date(end), new Date(start));
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const formatRelativeTime = (date: string | null) => {
    if (!date) return 'N/A';
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return 'Invalid date';
      return formatDistanceToNow(parsedDate, { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Synchronization Logs</DialogTitle>
          <DialogDescription>
            Last 50 synchronization attempts for this integration
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No sync history</h3>
            <p className="text-muted-foreground">This integration has not synced yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <Collapsible key={log.sync_id}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(log.sync_status)}
                    <Badge variant={log.sync_status === 'completed' ? 'default' : 'destructive'}>
                      {log.sync_status}
                    </Badge>
                    <span className="text-sm">
                      {formatRelativeTime(log.created_at)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {log.records_synced} records
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>

                <CollapsibleContent className="p-4 bg-muted/30 rounded-b-lg border border-t-0">
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong className="text-muted-foreground">Started:</strong>
                        <div>{formatDate(log.sync_started_at)}</div>
                      </div>
                      <div>
                        <strong className="text-muted-foreground">Ended:</strong>
                        <div>{formatDate(log.sync_ended_at)}</div>
                      </div>
                    </div>
                    <div>
                      <strong className="text-muted-foreground">Duration:</strong>{' '}
                      {calculateDuration(log.sync_started_at, log.sync_ended_at)}
                    </div>
                    <div>
                      <strong className="text-muted-foreground">Records Synced:</strong>{' '}
                      {log.records_synced.toLocaleString()}
                    </div>
                    {log.error_message && (
                      <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                        <strong className="text-red-800 dark:text-red-200">Error:</strong>
                        <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap text-red-700 dark:text-red-300">
                          {log.error_message}
                        </pre>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={downloadLogs} disabled={logs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Download JSON
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
