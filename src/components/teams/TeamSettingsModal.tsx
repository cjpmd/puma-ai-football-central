
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Team } from '@/types/team';
import { TeamBasicSettings } from './settings/TeamBasicSettings';
import { TeamSubscriptionSettings } from './settings/TeamSubscriptionSettings';
import { TeamAttributeSettings } from './settings/TeamAttributeSettings';
import { TeamStaffSettings } from './settings/TeamStaffSettings';
import { TeamFAConnection } from './settings/TeamFAConnection';
import { TeamKitSettings } from './settings/TeamKitSettings';
import { Settings, Users, Trophy, Star, Wifi, Shirt } from 'lucide-react';

interface TeamSettingsModalProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamSettingsModal: React.FC<TeamSettingsModalProps> = ({
  team,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState('basic');

  const settingsTabs = [
    {
      id: 'basic',
      label: 'Basic Settings',
      icon: <Settings className="h-4 w-4" />,
      component: <TeamBasicSettings team={team} onUpdate={onUpdate} />
    },
    {
      id: 'subscription',
      label: 'Subscriptions',
      icon: <Trophy className="h-4 w-4" />,
      component: <TeamSubscriptionSettings team={team} onUpdate={onUpdate} />
    },
    {
      id: 'attributes',
      label: 'Player Attributes',
      icon: <Star className="h-4 w-4" />,
      component: <TeamAttributeSettings team={team} onUpdate={onUpdate} />
    },
    {
      id: 'staff',
      label: 'Staff Management',
      icon: <Users className="h-4 w-4" />,
      component: <TeamStaffSettings team={team} onUpdate={onUpdate} />
    },
    {
      id: 'fa-connection',
      label: 'FA Connection',
      icon: <Wifi className="h-4 w-4" />,
      component: <TeamFAConnection team={team} onUpdate={onUpdate} />
    },
    {
      id: 'kit',
      label: 'Kit Icons',
      icon: <Shirt className="h-4 w-4" />,
      component: <TeamKitSettings team={team} onUpdate={onUpdate} />
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] h-[90vh] max-h-[800px] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle>Team Settings - {team.name}</DialogTitle>
          <DialogDescription>
            Configure your team settings, subscriptions, and integrations.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-6 flex-shrink-0 mb-4">
            {settingsTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 text-xs">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="flex-1 overflow-hidden">
            {settingsTabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-6 pb-6">
                    <Card className="border-0 shadow-none">
                      <CardHeader className="px-0">
                        <CardTitle className="flex items-center gap-2">
                          {tab.icon}
                          {tab.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-0">
                        {tab.component}
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </div>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
