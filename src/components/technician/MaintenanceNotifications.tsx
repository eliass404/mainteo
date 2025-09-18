import { useMaintenanceNotifications } from '@/hooks/useMaintenanceNotifications';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function MaintenanceNotifications() {
  const { notifications, loading, dismissNotification } = useMaintenanceNotifications();

  if (loading) {
    return null;
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {notifications.map((notification) => (
        <Alert key={notification.id} className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-orange-800">
                {notification.message}
              </span>
              <Badge variant="outline" className="text-orange-700 border-orange-300">
                {new Date(notification.notification_date).toLocaleDateString('fr-FR')}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissNotification(notification.id)}
              className="text-orange-600 hover:text-orange-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}