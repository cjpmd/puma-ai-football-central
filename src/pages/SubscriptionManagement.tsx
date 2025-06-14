import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Users, BarChart3, Calendar, Shield, Zap } from 'lucide-react';
import { Team } from '@/types/team';
import { Club } from '@/types/club';

const SubscriptionManagement = () => {
  const { teams, clubs } = useAuth();

  const subscriptionFeatures = {
    free: [
      'Basic team management',
      'Player profiles',
      'Event scheduling',
      'Up to 20 players per team'
    ],
    analytics_plus: [
      'Everything in Free',
      'Advanced analytics',
      'Performance tracking',
      'Unlimited players',
      'Match statistics',
      'Export capabilities',
      'Priority support'
    ]
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage your platform and player subscriptions
          </p>
        </div>

        {/* Platform Subscriptions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Platform Subscriptions</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Free Plan */}
            <Card className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Free Plan
                  </CardTitle>
                  <Badge variant="secondary">Current</Badge>
                </div>
                <CardDescription>
                  Perfect for getting started with team management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-3xl font-bold">£0<span className="text-sm font-normal">/month</span></div>
                  <ul className="space-y-2">
                    {subscriptionFeatures.free.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Analytics Plus Plan */}
            <Card className="relative border-puma-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Analytics Plus
                  </CardTitle>
                  <Badge className="bg-puma-blue-500">Upgrade</Badge>
                </div>
                <CardDescription>
                  Advanced features for serious team management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-3xl font-bold">£9.99<span className="text-sm font-normal">/month</span></div>
                  <ul className="space-y-2">
                    {subscriptionFeatures.analytics_plus.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full bg-puma-blue-500 hover:bg-puma-blue-600">
                    Upgrade Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Player Subscription Overview */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Player Subscription Types</h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Full Squad
                </CardTitle>
                <CardDescription>
                  Complete access to all team features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Match selection eligibility
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Performance tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Training sessions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Match statistics
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Training Only
                </CardTitle>
                <CardDescription>
                  Access to training sessions only
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Training sessions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Basic performance tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    Match selection eligibility
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    Match statistics
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Trialist
                </CardTitle>
                <CardDescription>
                  Free trial period - no payment required
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Training sessions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    Limited match selection
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    Basic performance tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    Full match statistics
                  </li>
                </ul>
                <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <strong>Free for trial period</strong> - Convert to paid subscription for full access
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team Subscriptions */}
        {teams.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Team Subscriptions</h2>
            
            <div className="grid gap-4">
              {teams.map((team) => (
                <Card key={team.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {team.name}
                      </CardTitle>
                      <Badge variant={team.subscriptionType === 'analytics_plus' ? 'default' : 'secondary'}>
                        {team.subscriptionType === 'analytics_plus' ? 'Analytics Plus' : 'Free'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {team.ageGroup} • {team.gameFormat}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Current Plan</p>
                        <p className="font-medium">
                          {team.subscriptionType === 'analytics_plus' ? 'Analytics Plus' : 'Free Plan'}
                        </p>
                      </div>
                      {team.subscriptionType === 'free' && (
                        <Button size="sm" className="bg-puma-blue-500 hover:bg-puma-blue-600">
                          <Zap className="mr-2 h-4 w-4" />
                          Upgrade Team
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Club Subscriptions */}
        {clubs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Club Subscriptions</h2>
            
            <div className="grid gap-4">
              {clubs.map((club) => (
                <Card key={club.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        {club.name}
                      </CardTitle>
                      <Badge variant={club.subscriptionType === 'analytics_plus' ? 'default' : 'secondary'}>
                        {club.subscriptionType === 'analytics_plus' ? 'Analytics Plus' : 'Free'}
                      </Badge>
                    </div>
                    <CardDescription>
                      Club Reference: {club.referenceNumber || 'Not set'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Current Plan</p>
                        <p className="font-medium">
                          {club.subscriptionType === 'analytics_plus' ? 'Analytics Plus' : 'Free Plan'}
                        </p>
                      </div>
                      {club.subscriptionType === 'free' && (
                        <Button size="sm" className="bg-puma-blue-500 hover:bg-puma-blue-600">
                          <Zap className="mr-2 h-4 w-4" />
                          Upgrade Club
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionManagement;
