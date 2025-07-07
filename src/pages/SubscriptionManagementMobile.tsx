
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Crown, Star, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
  isCurrentPlan?: boolean;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '£0/month',
    features: [
      'Up to 20 players',
      'Basic event management',
      'Simple statistics',
      'Email support'
    ]
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '£9.99/month',
    features: [
      'Up to 50 players',
      'Advanced event management',
      'Performance tracking',
      'Team communication',
      'Priority support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '£19.99/month',
    features: [
      'Unlimited players',
      'Advanced analytics',
      'Custom reports',
      'API access',
      'Multi-team management',
      '24/7 support'
    ],
    isPopular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    features: [
      'Everything in Pro',
      'White-label solution',
      'Custom integrations',
      'Dedicated support',
      'On-premise option'
    ]
  }
];

export default function SubscriptionManagementMobile() {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, teams } = useAuth();

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    try {
      // TODO: Implement actual subscription upgrade logic
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: 'Success',
        description: `Successfully upgraded to ${planId} plan!`,
      });
      
      setCurrentPlan(planId);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upgrade subscription',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'pro':
      case 'enterprise':
        return <Crown className="h-5 w-5" />;
      case 'basic':
        return <Star className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'enterprise':
        return 'border-purple-500 bg-purple-50';
      case 'pro':
        return 'border-blue-500 bg-blue-50';
      case 'basic':
        return 'border-green-500 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Current Subscription */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg capitalize">{currentPlan} Plan</h3>
                <p className="text-sm text-muted-foreground">
                  {subscriptionPlans.find(p => p.id === currentPlan)?.price}
                </p>
              </div>
              <Badge className="bg-green-500">Active</Badge>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Currently managing {teams?.length || 0} team{teams?.length !== 1 ? 's' : ''}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Plans */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Plans</h2>
          
          {subscriptionPlans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${getPlanColor(plan.id)} ${plan.isPopular ? 'border-2' : ''}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500">Most Popular</Badge>
                </div>
              )}
              
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {getPlanIcon(plan.id)}
                    <h3 className="font-semibold text-lg ml-2">{plan.name}</h3>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{plan.price}</div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                {plan.id === currentPlan ? (
                  <Button disabled className="w-full h-12">
                    Current Plan
                  </Button>
                ) : (
                  <Button 
                    className="w-full h-12"
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading}
                    variant={plan.isPopular ? 'default' : 'outline'}
                  >
                    {loading ? 'Processing...' : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Billing Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Billing Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next billing date:</span>
                <span>March 15, 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment method:</span>
                <span>•••• •••• •••• 1234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing email:</span>
                <span className="truncate">{user?.email}</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4 h-12">
              Update Billing Details
            </Button>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
