import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Settings, Image, Monitor, Trophy, Target, Star, Wifi, 
  Wrench, Package, User, Shield, GitBranch, ChevronRight, ChevronLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { Team } from '@/types/index';

// Import all settings components
import { TeamBasicSettings } from '@/components/teams/settings/TeamBasicSettings';
import { TeamLogoSettings } from '@/components/teams/settings/TeamLogoSettings';
import { TeamHeaderSettings } from '@/components/teams/settings/TeamHeaderSettings';
import { TeamSubscriptionSettings } from '@/components/teams/settings/TeamSubscriptionSettings';
import { TeamPerformanceSettings } from '@/components/teams/settings/TeamPerformanceSettings';
import { TeamAttributeSettings } from '@/components/teams/settings/TeamAttributeSettings';
import { TeamFAConnection } from '@/components/teams/settings/TeamFAConnection';
import { TeamKitSettings } from '@/components/teams/settings/TeamKitSettings';
import { TeamKitManagementSettings } from '@/components/teams/settings/TeamKitManagementSettings';
import { TeamEquipmentSettings } from '@/components/teams/settings/TeamEquipmentSettings';
import { TeamNameDisplaySettings } from '@/components/teams/settings/TeamNameDisplaySettings';
import { TeamPrivacySettings } from '@/components/teams/settings/TeamPrivacySettings';
import { TeamSplitSettings } from '@/components/teams/settings/TeamSplitSettings';

interface SettingsSection {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  group: string;
}

export default function TeamSettingsMobile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isTeamManager, isGlobalAdmin } = useAuthorization();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canSplitTeam = isGlobalAdmin || (id ? isTeamManager(id) : false);

  useEffect(() => {
    if (id) {
      loadTeam();
    }
  }, [id]);

  const loadTeam = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform to Team type - cast as any first to add extra properties
      const transformedTeam = {
        id: data.id,
        name: data.name,
        ageGroup: data.age_group || '',
        seasonStart: data.season_start || '',
        seasonEnd: data.season_end || '',
        clubId: data.club_id,
        subscriptionType: (data.subscription_type || 'free') as any,
        gameFormat: (data.game_format || '7-a-side') as any,
        gameDuration: data.game_duration,
        kitIcons: (data.kit_icons || { home: '', away: '', training: '', goalkeeper: '' }) as any,
        logoUrl: data.logo_url,
        performanceCategories: data.performance_categories || [],
        managerName: data.manager_name,
        managerEmail: data.manager_email,
        managerPhone: data.manager_phone,
        homeLocation: data.home_location,
        homeLatitude: data.home_latitude,
        homeLongitude: data.home_longitude,
        privacySettings: (data as any).privacy_settings,
        kitDesigns: data.kit_designs as any,
        playerAttributes: data.player_attributes as any,
        faConnection: (data as any).fa_connection,
        nameDisplayOption: data.name_display_option as any,
        headerDisplayType: data.header_display_type as any,
        headerImageUrl: data.header_image_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } as Team;

      setTeam(transformedTeam);
    } catch (error: any) {
      console.error('Error loading team:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team settings',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (data: Partial<Team>) => {
    if (team) {
      setTeam({ ...team, ...data });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Individual components handle their own saving
      setIsSaving(false);
    } catch (error) {
      setIsSaving(false);
    }
  };

  const settingsSections: SettingsSection[] = [
    // General
    { id: 'basic', label: 'Basic Info', description: 'Team name, age group, and season', icon: <Settings className="w-5 h-5" />, group: 'General' },
    { id: 'logo', label: 'Team Logo', description: 'Upload and manage team logo', icon: <Image className="w-5 h-5" />, group: 'General' },
    { id: 'header', label: 'Mobile Header', description: 'Customize header display', icon: <Monitor className="w-5 h-5" />, group: 'General' },
    { id: 'name-display', label: 'Name Display', description: 'How player names appear', icon: <User className="w-5 h-5" />, group: 'General' },
    
    // Team Management
    { id: 'performance', label: 'Performance Categories', description: 'Skill level groupings', icon: <Target className="w-5 h-5" />, group: 'Team Management' },
    { id: 'attributes', label: 'Player Attributes', description: 'Customize attribute tracking', icon: <Star className="w-5 h-5" />, group: 'Team Management' },
    { id: 'equipment', label: 'Equipment', description: 'Team equipment inventory', icon: <Package className="w-5 h-5" />, group: 'Team Management' },
    
    // Kit & Gear
    { id: 'kit-designer', label: 'Kit Designer', description: 'Design team kits', icon: <Wrench className="w-5 h-5" />, group: 'Kit & Gear' },
    { id: 'kit-management', label: 'Kit Sizes', description: 'Track player kit sizes', icon: <Wrench className="w-5 h-5" />, group: 'Kit & Gear' },
    
    // Other
    { id: 'subscription', label: 'Subscriptions', description: 'Manage team subscription', icon: <Trophy className="w-5 h-5" />, group: 'Subscriptions' },
    { id: 'fa-connection', label: 'FA Connection', description: 'Link to FA system', icon: <Wifi className="w-5 h-5" />, group: 'Integrations' },
    { id: 'privacy', label: 'Privacy Settings', description: 'Data visibility controls', icon: <Shield className="w-5 h-5" />, group: 'Privacy & Security' },
    
    // Advanced (conditional)
    ...(canSplitTeam ? [
      { id: 'split', label: 'Split Team', description: 'Divide into separate teams', icon: <GitBranch className="w-5 h-5" />, group: 'Advanced' }
    ] : [])
  ];

  const groupedSections = settingsSections.reduce((acc, section) => {
    if (!acc[section.group]) {
      acc[section.group] = [];
    }
    acc[section.group].push(section);
    return acc;
  }, {} as Record<string, SettingsSection[]>);

  const renderSettingsContent = () => {
    if (!team || !activeSection) return null;

    switch (activeSection) {
      case 'basic':
        return <TeamBasicSettings team={team} onUpdate={handleUpdate} onSave={handleSave} isSaving={isSaving} />;
      case 'logo':
        return <TeamLogoSettings team={team} onUpdate={handleUpdate} />;
      case 'header':
        return <TeamHeaderSettings team={team} onUpdate={handleUpdate} onSave={handleSave} isSaving={isSaving} />;
      case 'name-display':
        return <TeamNameDisplaySettings team={team} onUpdate={handleUpdate} />;
      case 'performance':
        return <TeamPerformanceSettings teamId={team.id} />;
      case 'attributes':
        return <TeamAttributeSettings team={team as any} onUpdate={handleUpdate} />;
      case 'equipment':
        return <TeamEquipmentSettings team={team} onUpdate={handleUpdate} />;
      case 'kit-designer':
        return <TeamKitSettings team={team} onUpdate={handleUpdate} />;
      case 'kit-management':
        return <TeamKitManagementSettings team={team} onUpdate={handleUpdate} />;
      case 'subscription':
        return <TeamSubscriptionSettings team={team} onUpdate={handleUpdate} />;
      case 'fa-connection':
        return <TeamFAConnection team={team as any} onUpdate={handleUpdate} />;
      case 'privacy':
        return <TeamPrivacySettings team={team} onUpdate={handleUpdate} />;
      case 'split':
        return <TeamSplitSettings team={team} onUpdate={handleUpdate} />;
      default:
        return null;
    }
  };

  const getActiveLabel = () => {
    return settingsSections.find(s => s.id === activeSection)?.label || '';
  };

  if (loading) {
    return (
      <MobileLayout headerTitle="Team Settings">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (!team) {
    return (
      <MobileLayout headerTitle="Team Settings">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-gray-500">Team not found</p>
          <Button variant="link" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout headerTitle={`Settings: ${team.name}`}>
      <div className="min-h-screen bg-gray-50 -mx-4 -mt-4 px-4 pt-4">
        <div className="space-y-4 pb-safe-bottom">
          
          {/* Back to Dashboard */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          {/* Settings Groups */}
          {Object.entries(groupedSections).map(([group, sections]) => (
            <div key={group} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100">
                <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">{group}</h2>
              </div>
              
              {sections.map((section, index) => (
                <div key={section.id}>
                  {index > 0 && <div className="h-px bg-gray-100 mx-4" />}
                  <button
                    onClick={() => setActiveSection(section.id)}
                    className="w-full flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                        {section.icon}
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium text-gray-900 block">{section.label}</span>
                        <span className="text-xs text-gray-500">{section.description}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Settings Sheet */}
      <Sheet open={!!activeSection} onOpenChange={(open) => !open && setActiveSection(null)}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
            <SheetTitle className="text-left">{getActiveLabel()}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="pb-24">
              {renderSettingsContent()}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
}
