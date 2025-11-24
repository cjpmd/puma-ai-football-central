
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Team } from '@/types';
import { TeamBasicSettings } from './settings/TeamBasicSettings';
import { TeamSubscriptionSettings } from './settings/TeamSubscriptionSettings';
import { TeamAttributeSettings } from './settings/TeamAttributeSettings';
import { TeamFAConnection } from './settings/TeamFAConnection';
import { TeamKitManagementSettings } from './settings/TeamKitManagementSettings';
import { TeamPerformanceSettings } from './settings/TeamPerformanceSettings';
import { TeamEquipmentSettings } from './settings/TeamEquipmentSettings';
import { TeamPrivacySettings } from './settings/TeamPrivacySettings';
import { TeamNameDisplaySettings } from './settings/TeamNameDisplaySettings';
import { TeamHeaderSettings } from './settings/TeamHeaderSettings';
import { TeamLogoSettings } from './settings/TeamLogoSettings';
import { Settings, Trophy, Star, Wifi, Target, Package, Shield, Wrench, User, Monitor, Image, Palette } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save logic would go here - for now just close modal
      onClose();
    } catch (error) {
      console.error('Error saving team settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const settingsTabs = [
    {
      id: 'basic',
      label: 'Basic',
      icon: <Settings className="h-4 w-4" />,
      component: <TeamBasicSettings key={`basic-${team.id}`} team={team} onUpdate={onUpdate} onSave={handleSave} isSaving={isSaving} />
    },
    {
      id: 'logo',
      label: 'Logo',
      icon: <Image className="h-4 w-4" />,
      component: <TeamLogoSettings key={`logo-${team.id}`} team={team} onUpdate={onUpdate} />
    },
    {
      id: 'header',
      label: 'Header',
      icon: <Monitor className="h-4 w-4" />,
      component: <TeamHeaderSettings team={team} onUpdate={onUpdate} onSave={handleSave} isSaving={isSaving} />
    },
    {
      id: 'subscription',
      label: 'Subscriptions',
      icon: <Trophy className="h-4 w-4" />,
      component: <TeamSubscriptionSettings team={team} onUpdate={onUpdate} />
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: <Target className="h-4 w-4" />,
      component: <TeamPerformanceSettings teamId={team.id} />
    },
    {
      id: 'attributes',
      label: 'Attributes',
      icon: <Star className="h-4 w-4" />,
      component: <TeamAttributeSettings team={team as any} onUpdate={onUpdate} />
    },
    {
      id: 'fa-connection',
      label: 'FA',
      icon: <Wifi className="h-4 w-4" />,
      component: <TeamFAConnection team={team as any} onUpdate={onUpdate} />
    },
    {
      id: 'kit-management',
      label: 'Kit',
      icon: <Wrench className="h-4 w-4" />,
      component: <TeamKitManagementSettings team={team} onUpdate={onUpdate} />
    },
    {
      id: 'equipment',
      label: 'Equipment',
      icon: <Package className="h-4 w-4" />,
      component: <TeamEquipmentSettings team={team} onUpdate={onUpdate} />
    },
    {
      id: 'name-display',
      label: 'Names',
      icon: <User className="h-4 w-4" />,
      component: <TeamNameDisplaySettings team={team} onUpdate={onUpdate} />
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: <Shield className="h-4 w-4" />,
      component: <TeamPrivacySettings team={team} onUpdate={onUpdate} />
    }
  ];

  // Play Styles management moved to /admin/play-styles for global admins only
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] h-[90vh] max-h-[800px] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle>Team Settings - {team.name}</DialogTitle>
          <DialogDescription>
            Configure your team settings, subscriptions, and integrations.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className={`grid w-full flex-shrink-0 mb-4 ${user?.email === 'chrisjpmcdonald@gmail.com' ? 'grid-cols-12' : 'grid-cols-11'}`}>
            {settingsTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex flex-col items-center gap-1 text-xs p-2">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="flex-1 overflow-hidden">
            {settingsTabs.map((tab) => (
              <TabsContent 
                key={tab.id} 
                value={tab.id} 
                className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden"
              >
                <ScrollArea className="flex-1 pr-4 overflow-auto">
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
        
        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
