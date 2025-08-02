import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Eye, RefreshCw } from "lucide-react";
import { securityService } from "@/services/securityService";
import { toast } from "sonner";

interface SecurityLog {
  id: string;
  action_type: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  metadata: any;
  user_id?: string;
  ip_address?: string;
}

export function SecurityDashboard() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspiciousActivity, setSuspiciousActivity] = useState<{
    suspicious: boolean;
    patterns: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } | null>(null);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [auditLogs, activityCheck] = await Promise.all([
        securityService.getSecurityAuditLogs(50),
        securityService.detectSuspiciousActivity()
      ]);

      setLogs(auditLogs);
      setSuspiciousActivity(activityCheck);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
      default:
        return 'secondary';
    }
  };

  const getRiskLevelCounts = () => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    logs.forEach(log => {
      counts[log.risk_level as keyof typeof counts]++;
    });
    return counts;
  };

  const riskCounts = getRiskLevelCounts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
          <p className="text-muted-foreground">Monitor security events and system integrity</p>
        </div>
        <Button onClick={loadSecurityData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Risk Level Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{riskCounts.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Risk Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{riskCounts.high}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{riskCounts.medium}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Risk Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{riskCounts.low}</div>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious Activity Alert */}
      {suspiciousActivity?.suspicious && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Suspicious Activity Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{suspiciousActivity.riskLevel.toUpperCase()}</Badge>
                <span className="text-sm text-red-700">Risk Level</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {suspiciousActivity.patterns.map((pattern, index) => (
                  <li key={index} className="text-sm text-red-700">{pattern}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Recent Security Events
          </CardTitle>
          <CardDescription>
            Latest security events and audit logs (last 50 events)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading security events...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No security events found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getRiskBadgeVariant(log.risk_level)}>
                        {log.risk_level.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{log.action_type}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {log.user_id && <div>User: {log.user_id.substring(0, 8)}...</div>}
                    {log.ip_address && <div>IP: {log.ip_address}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}