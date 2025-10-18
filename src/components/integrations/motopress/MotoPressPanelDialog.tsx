'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { MotoPressPanelContent } from './MotoPressPanelContent'

interface MotoPressPanelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  onSyncComplete?: () => void
}

export function MotoPressPanelDialog({
  open,
  onOpenChange,
  tenantId,
  onSyncComplete
}: MotoPressPanelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            MotoPress Hotel Booking Integration
          </DialogTitle>
          <DialogDescription>
            Configure, preview, and sync accommodations from your MotoPress site
          </DialogDescription>
        </DialogHeader>

        <MotoPressPanelContent
          tenantId={tenantId}
          onClose={() => onOpenChange(false)}
          onSyncComplete={onSyncComplete}
        />
      </DialogContent>
    </Dialog>
  )
}
