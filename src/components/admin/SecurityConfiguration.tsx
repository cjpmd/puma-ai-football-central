import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle, AlertTriangle, Settings } from 'lucide-react';

export function SecurityConfiguration() {
  const configurationSteps = [
    {
      id: 'password-protection',
      title: 'Enable Leaked Password Protection',
      description: 'Protect against commonly leaked passwords',
      status: 'action-required',
      critical: true,
      steps: [
        'Go to your Supabase Dashboard',
        'Navigate to Authentication → Settings',
        'Find "Password Protection" section',
        'Enable "Leaked Password Protection"',
        'Save the changes'
      ],
      dashboardUrl: 'https://supabase.com/dashboard/project/pdarngodvrzehnpvdrii/auth/providers'
    },
    {
      id: 'security-definer-fixed',
      title: 'Security Definer Views Fixed',
      description: 'All views now use proper RLS enforcement',
      status: 'completed',
      critical: false,
      steps: [
        'Converted all Security Definer views to regular views',
        'Added proper RLS policies to all new tables',
        'Fixed function search paths'
      ]
    },
    {
      id: 'enhanced-validation',
      title: 'Enhanced Authentication Validation',
      description: 'Server-side validation and rate limiting implemented',
      status: 'completed',
      critical: false,
      steps: [
        'Enhanced password strength validation',
        'Server-side rate limiting',
        'IP-based tracking and blocking',
        'Session security monitoring'
      ]
    },
    {
      id: 'audit-logging',
      title: 'Comprehensive Audit Logging',
      description: 'All security events are now tracked and logged',
      status: 'completed',
      critical: false,
      steps: [
        'Enhanced security event logging',
        'Suspicious activity detection',
        'Role-based access control validation',
        'Session tracking and monitoring'
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'action-required':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Settings className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string, critical: boolean) => {
    if (status === 'completed') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (status === 'action-required') {
      return critical ? 
        <Badge variant="destructive">Action Required</Badge> : 
        <Badge variant="default" className="bg-yellow-100 text-yellow-800">Action Required</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const actionRequiredCount = configurationSteps.filter(step => step.status === 'action-required').length;
  const completedCount = configurationSteps.filter(step => step.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Configuration</h2>
          <p className="text-muted-foreground">
            Security implementation status and required manual configurations
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">
            {completedCount} completed, {actionRequiredCount} action required
          </div>
        </div>
      </div>

      {/* Overall Status Alert */}
      {actionRequiredCount > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            <strong>Manual Configuration Required:</strong> {actionRequiredCount} critical security 
            configuration{actionRequiredCount > 1 ? 's' : ''} require{actionRequiredCount === 1 ? 's' : ''} manual setup in your Supabase dashboard.
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Steps */}
      <div className="grid gap-4">
        {configurationSteps.map((step) => (
          <Card key={step.id} className={step.status === 'action-required' && step.critical ? 'border-red-200' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(step.status)}
                  <div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                </div>
                {getStatusBadge(step.status, step.critical)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ul className="space-y-2">
                  {step.steps.map((stepText, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm">{stepText}</span>
                    </li>
                  ))}
                </ul>
                
                {step.dashboardUrl && step.status === 'action-required' && (
                  <div className="pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(step.dashboardUrl, '_blank')}
                      className="flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Open Supabase Dashboard</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Security Implementation Summary</CardTitle>
          <CardDescription>
            Overview of all security measures implemented in your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-green-800">✅ Implemented Features</h4>
              <ul className="space-y-2 text-sm">
                <li>• Enhanced password strength validation</li>
                <li>• Server-side rate limiting with IP tracking</li>
                <li>• Comprehensive audit logging</li>
                <li>• Suspicious activity detection</li>
                <li>• Role-based access control validation</li>
                <li>• Session security monitoring</li>
                <li>• Input sanitization and XSS protection</li>
                <li>• Fixed Security Definer vulnerabilities</li>
                <li>• Enhanced RLS policies on all tables</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-blue-800">🛡️ Security Benefits</h4>
              <ul className="space-y-2 text-sm">
                <li>• Protection against brute force attacks</li>
                <li>• Real-time security event monitoring</li>
                <li>• Automated threat detection</li>
                <li>• Secure user authentication flows</li>
                <li>• Data access control and privacy</li>
                <li>• Session hijacking prevention</li>
                <li>• SQL injection protection</li>
                <li>• Cross-site scripting (XSS) protection</li>
                <li>• Compliance with security best practices</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}