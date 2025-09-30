import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { childProgressService, type ChildProgressData } from '@/services/childProgressService';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ChildSummaryCard } from '@/components/child-progress/ChildSummaryCard';
import { ChildMatchHistory } from '@/components/child-progress/ChildMatchHistory';
import { ChildTrainingProgress } from '@/components/child-progress/ChildTrainingProgress';
import { ChildCalendarView } from '@/components/child-progress/ChildCalendarView';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'matches', label: 'Matches' },
  { id: 'training', label: 'Training' },
  { id: 'calendar', label: 'Calendar' }
];

const ChildProgressMobile = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildProgressData[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.id) {
      loadChildrenData();
    }
  }, [user?.id]);

  const loadChildrenData = async () => {
    try {
      setLoading(true);
      const childrenData = await childProgressService.getChildrenForParent(user!.id);
      setChildren(childrenData);
      if (childrenData.length > 0) {
        setSelectedChild(childrenData[0]);
      }
    } catch (error) {
      console.error('Error loading children data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load child progress data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading player progress...</div>
        </div>
      </MobileLayout>
    );
  }

  if (children.length === 0) {
    return (
      <MobileLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-4">No Players Found</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            You don't have any players linked to your account yet.
          </p>
          <Button onClick={loadChildrenData} size="sm">Refresh</Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout 
      showTabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      stickyTabs
    >
      <div className="space-y-4">
        {/* Player Selection */}
        {children.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Player</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedChild?.id} 
                onValueChange={(childId) => {
                  const child = children.find(c => c.id === childId);
                  setSelectedChild(child || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a player" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={child.photo} />
                          <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {child.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {selectedChild && (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <ChildSummaryCard child={selectedChild} />
              </div>
            )}

            {activeTab === 'matches' && (
              <ChildMatchHistory child={selectedChild} />
            )}

            {activeTab === 'training' && (
              <ChildTrainingProgress child={selectedChild} />
            )}

            {activeTab === 'calendar' && (
              <ChildCalendarView child={selectedChild} />
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default ChildProgressMobile;