'use client';

import { AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ComplianceTenant {
  tenant_id: string;
  subdomain: string;
  nombre_comercial: string;
  status: 'warning' | 'overdue' | 'compliant' | 'never_submitted';
  days_since_last: number | null;
}

interface ComplianceAlertsProps {
  tenants: ComplianceTenant[];
  maxDisplay?: number;
  onViewAll?: () => void;
}

export default function ComplianceAlerts({
  tenants,
  maxDisplay = 5,
  onViewAll
}: ComplianceAlertsProps) {
  if (!tenants || tenants.length === 0) {
    return null;
  }

  // Separate by severity
  const overdueTenants = tenants.filter(t => t.status === 'overdue');
  const warningTenants = tenants.filter(t => t.status === 'warning');

  // Determine which alert to show (overdue takes priority)
  const showOverdue = overdueTenants.length > 0;
  const showWarning = !showOverdue && warningTenants.length > 0;

  if (!showOverdue && !showWarning) {
    return null;
  }

  const displayTenants = showOverdue ? overdueTenants : warningTenants;
  const limitedTenants = displayTenants.slice(0, maxDisplay);
  const hasMore = displayTenants.length > maxDisplay;

  return (
    <Alert
      variant={showOverdue ? 'destructive' : 'default'}
      className={showOverdue
        ? ''
        : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10'
      }
    >
      {showOverdue ? (
        <AlertCircle className="h-5 w-5" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
      )}

      <AlertTitle className={showOverdue ? '' : 'text-orange-900 dark:text-orange-400'}>
        {showOverdue ? (
          <>
            Critical: {overdueTenants.length} Tenant{overdueTenants.length !== 1 ? 's' : ''} Overdue
          </>
        ) : (
          <>
            Warning: {warningTenants.length} Tenant{warningTenants.length !== 1 ? 's' : ''} At Risk
          </>
        )}
      </AlertTitle>

      <AlertDescription className={showOverdue ? '' : 'text-orange-800 dark:text-orange-300'}>
        <div className="mt-2 space-y-2">
          <p className="text-sm mb-3">
            {showOverdue
              ? 'The following tenants have not submitted compliance data in over 30 days:'
              : 'The following tenants have not submitted compliance data in 20-30 days:'
            }
          </p>

          <div className="space-y-1.5">
            {limitedTenants.map((tenant) => (
              <div
                key={tenant.tenant_id}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50 dark:bg-background/20"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium truncate">
                    {tenant.nombre_comercial}
                  </span>
                  <a
                    href={`https://${tenant.subdomain}.muva.chat`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs opacity-70 hover:opacity-100 flex items-center gap-1 shrink-0"
                  >
                    {tenant.subdomain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Badge
                  variant="outline"
                  className={
                    showOverdue
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700 shrink-0'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700 shrink-0'
                  }
                >
                  {tenant.days_since_last} days
                </Badge>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-3 pt-2 border-t border-current/20">
              <Button
                variant="link"
                size="sm"
                onClick={onViewAll}
                className={
                  showOverdue
                    ? 'text-destructive hover:text-destructive/80 h-auto p-0'
                    : 'text-orange-700 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 h-auto p-0'
                }
              >
                View all {displayTenants.length} tenant{displayTenants.length !== 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
