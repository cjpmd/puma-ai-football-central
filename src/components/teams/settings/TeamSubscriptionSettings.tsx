
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Team, PlayerSubscriptionType, SubscriptionStatus } from '@/types';
import { Calendar, Users, PoundSterling, TrendingUp, Pause, Play, X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface TeamSubscriptionSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamSubscriptionSettings: React.FC<TeamSubscriptionSettingsProps> = ({
  team,
  onUpdate
}) => {
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    fullSquadValue: 25,
    trainingValue: 15,
    trialistValue: 0, // Free for trialists
    currency: 'GBP'
  });

  const [isSaving, setIsSaving] = useState(false);

  // Mock subscription data - would come from database
  const mockSubscriptions = [
    {
      id: '1',
      playerName: 'John Smith',
      type: 'full_squad' as PlayerSubscriptionType,
      status: 'active' as SubscriptionStatus,
      value: subscriptionSettings.fullSquadValue,
      startDate: '2024-01-01',
      parentName: 'Sarah Smith'
    },
    {
      id: '2',
      playerName: 'Emma Jones',
      type: 'training' as PlayerSubscriptionType,
      status: 'paused' as SubscriptionStatus,
      value: subscriptionSettings.trainingValue,
      startDate: '2024-01-15',
      parentName: 'Mike Jones'
    },
    {
      id: '3',
      playerName: 'Tom Wilson',
      type: 'trialist' as PlayerSubscriptionType,
      status: 'active' as SubscriptionStatus,
      value: 0,
      startDate: '2024-02-01',
      parentName: 'Lisa Wilson'
    }
  ];

  const totalMonthlyIncome = mockSubscriptions
    .filter(sub => sub.status === 'active')
    .reduce((total, sub) => total + sub.value, 0);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Here you would save to the database
      // For now, just show a success message
      toast.success('Subscription settings saved successfully');
      
      // Update the team object with new subscription settings
      onUpdate({
        subscriptionSettings: subscriptionSettings
      });
    } catch (error) {
      toast.error('Failed to save subscription settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case "active": return 'bg-green-500';
      case "paused": return 'bg-yellow-500';
      case "inactive": return 'bg-red-500';
      case "pending": return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSubscriptionTypeLabel = (type: PlayerSubscriptionType) => {
    switch (type) {
      case 'full_squad': return 'Full Squad';
      case 'training': return 'Training Only';
      case 'trialist': return 'Trialist';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Subscription Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5" />
            Subscription Pricing
          </CardTitle>
          <CardDescription>
            Set the monthly subscription rates for different player types. These will apply to all teams in your club.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullSquadValue">Full Squad Subscription (£/month)</Label>
              <Input
                id="fullSquadValue"
                type="number"
                min="0"
                step="0.01"
                value={subscriptionSettings.fullSquadValue}
                onChange={(e) => setSubscriptionSettings(prev => ({ 
                  ...prev, 
                  fullSquadValue: Number(e.target.value) 
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Includes match selection, training, and full performance tracking
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainingValue">Training Only Subscription (£/month)</Label>
              <Input
                id="trainingValue"
                type="number"
                min="0"
                step="0.01"
                value={subscriptionSettings.trainingValue}
                onChange={(e) => setSubscriptionSettings(prev => ({ 
                  ...prev, 
                  trainingValue: Number(e.target.value) 
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Training sessions only, no match selection
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trialistValue">Trialist Subscription (£/month)</Label>
              <Input
                id="trialistValue"
                type="number"
                value={0}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Free trial period - no payment required
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings} 
              disabled={isSaving}
              className="bg-puma-blue-500 hover:bg-puma-blue-600"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Income Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Income Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">£{totalMonthlyIncome}</p>
              <p className="text-sm text-muted-foreground">Monthly Income</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{mockSubscriptions.filter(s => s.status === 'active').length}</p>
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{mockSubscriptions.filter(s => s.type === 'trialist').length}</p>
              <p className="text-sm text-muted-foreground">Trialists</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{mockSubscriptions.length}</p>
              <p className="text-sm text-muted-foreground">Total Subscribers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Subscriptions
          </CardTitle>
          <CardDescription>
            Manage player and parent subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockSubscriptions.map((subscription) => (
              <div key={subscription.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{subscription.playerName}</h4>
                    <Badge variant="outline" className="capitalize">
                      {getSubscriptionTypeLabel(subscription.type)}
                    </Badge>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(subscription.status)}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Parent: {subscription.parentName} • 
                    {subscription.value > 0 ? ` £${subscription.value}/month` : ' Free (Trialist)'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {subscription.type !== 'trialist' && (
                    <>
                      {subscription.status === 'active' ? (
                        <Button variant="outline" size="sm">
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="outline" size="sm">
                    <X className="h-4 w-4 mr-1" />
                    {subscription.type === 'trialist' ? 'Remove' : 'Cancel'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Subscription Reports
          </CardTitle>
          <CardDescription>
            Generate reports for specific time periods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportStart">Report Start Date</Label>
              <Input
                id="reportStart"
                type="date"
                defaultValue="2024-01-01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportEnd">Report End Date</Label>
              <Input
                id="reportEnd"
                type="date"
                defaultValue="2024-12-31"
              />
            </div>
          </div>
          <Button className="w-full">
            Generate Subscription Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
