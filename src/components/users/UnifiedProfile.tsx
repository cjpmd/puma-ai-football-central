import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Users, 
  Shield, 
  Trophy, 
  Calendar, 
  Settings,
  Link2,
  Crown,
  UserCheck,
  Star
} from 'lucide-react';
import { EditProfileModal } from './EditProfileModal';
import { UnifiedLinkedAccounts } from './UnifiedLinkedAccounts';
import { RoleAwareCalendar } from './RoleAwareCalendar';
import { formatPlayerName } from '@/utils/nameUtils';

interface RoleContext {
  type: 'player' | 'parent' | 'staff' | 'admin';
  id: string;
  name: string;
  context?: string; // e.g., "Parent of John", "Coach at Team A"
  entityId?: string;
  entityName?: string;
}

interface UnifiedProfileProps {
  userId?: string; // If not provided, uses current user
  viewMode?: 'self' | 'admin'; // self = viewing own profile, admin = admin viewing another user
}

export const UnifiedProfile: React.FC<UnifiedProfileProps> = ({ 
  userId, 
  viewMode = 'self' 
}) => {
  const { user, profile, teams, clubs, connectedPlayers } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<RoleContext[]>([]);
  const [activeRole, setActiveRole] = useState<string>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkedAccounts, setShowLinkedAccounts] = useState(false);

  const effectiveUserId = userId || user?.id;
  const isOwnProfile = effectiveUserId === user?.id;

  useEffect(() => {
    if (effectiveUserId) {
      loadProfileData();
    }
  }, [effectiveUserId]);

  const loadProfileData = async () => {
    if (!effectiveUserId) return;

    setLoading(true);
    try {
      // Load target user's profile if different from current user
      let profileData = profile;
      if (!isOwnProfile) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', effectiveUserId)
          .single();
        
        if (error) throw error;
        profileData = data as any; // Type assertion for flexibility
      }

      setTargetProfile(profileData);

      // Load all role contexts for the user
      const roles: RoleContext[] = [];

      // Check if user is a player
      const { data: playerData } = await supabase
        .from('user_players')
        .select(`
          player_id,
          relationship,
          players!inner(
            id, name, squad_number,
            teams!inner(id, name, age_group)
          )
        `)
        .eq('user_id', effectiveUserId);

      if (playerData) {
        playerData.forEach(link => {
          const player = link.players as any;
          const team = player.teams;
          
          if (link.relationship === 'self') {
            roles.push({
              type: 'player',
              id: `player_${player.id}`,
              name: 'Player',
              context: `${formatPlayerName(player.name, 'firstName')} - ${team.name}`,
              entityId: player.id,
              entityName: player.name
            });
          } else {
            roles.push({
              type: 'parent',
              id: `parent_${player.id}`,
              name: 'Parent',
              context: `Parent of ${formatPlayerName(player.name, 'firstName')}`,
              entityId: player.id,
              entityName: player.name
            });
          }
        });
      }

      // Check if user is staff
      const { data: staffData } = await supabase
        .from('user_staff')
        .select(`
          staff_id,
          relationship,
          team_staff!inner(
            id, name, role,
            teams!inner(id, name, age_group)
          )
        `)
        .eq('user_id', effectiveUserId);

      if (staffData) {
        staffData.forEach(link => {
          const staff = link.team_staff as any;
          const team = staff.teams;
          
          roles.push({
            type: 'staff',
            id: `staff_${staff.id}`,
            name: 'Staff',
            context: `${staff.role} at ${team.name}`,
            entityId: staff.id,
            entityName: staff.name
          });
        });
      }

      // Check admin roles
      if (profileData?.roles?.includes('global_admin')) {
        roles.push({
          type: 'admin',
          id: 'admin_global',
          name: 'Admin',
          context: 'Global Administrator'
        });
      }

      if (profileData?.roles?.includes('club_admin')) {
        roles.push({
          type: 'admin',
          id: 'admin_club',
          name: 'Admin',
          context: 'Club Administrator'
        });
      }

      setUserRoles(roles);
      
      // Set default active role
      if (roles.length > 0) {
        setActiveRole(roles[0].id);
      }

    } catch (error: any) {
      console.error('Error loading profile data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (roleType: string) => {
    switch (roleType) {
      case 'player': return <User className="h-4 w-4" />;
      case 'parent': return <Users className="h-4 w-4" />;
      case 'staff': return <UserCheck className="h-4 w-4" />;
      case 'admin': return <Crown className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (roleType: string) => {
    switch (roleType) {
      case 'player': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'parent': return 'bg-green-100 text-green-800 border-green-200';
      case 'staff': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const activeRoleData = userRoles.find(role => role.id === activeRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!targetProfile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            User profile not found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={targetProfile.photo_url} />
                <AvatarFallback className="text-lg font-semibold">
                  {getInitials(targetProfile.name || targetProfile.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">
                  {targetProfile.name || targetProfile.email}
                </h1>
                <p className="text-muted-foreground">{targetProfile.email}</p>
                {targetProfile.phone && (
                  <p className="text-sm text-muted-foreground">{targetProfile.phone}</p>
                )}
              </div>
            </div>
            {isOwnProfile && (
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowLinkedAccounts(true)}
                  className="flex items-center space-x-2"
                >
                  <Link2 className="h-4 w-4" />
                  <span>Linked Accounts</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Edit Profile</span>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        {/* Role Switcher */}
        {userRoles.length > 0 && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={activeRole === 'all' ? 'default' : 'outline'}
                className={`cursor-pointer ${activeRole === 'all' ? '' : 'hover:bg-muted'}`}
                onClick={() => setActiveRole('all')}
              >
                <Star className="h-3 w-3 mr-1" />
                All Roles
              </Badge>
              {userRoles.map((role) => (
                <Badge
                  key={role.id}
                  variant={activeRole === role.id ? 'default' : 'outline'}
                  className={`cursor-pointer ${
                    activeRole === role.id 
                      ? getRoleBadgeColor(role.type)
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setActiveRole(role.id)}
                >
                  {getRoleIcon(role.type)}
                  <span className="ml-1">{role.context || role.name}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Role-Specific Content */}
      <Tabs value="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Role-specific overview content */}
          {activeRole === 'all' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userRoles.map((role) => (
                <Card key={role.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getRoleIcon(role.type)}
                      {role.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {role.context}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveRole(role.id)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {activeRoleData && getRoleIcon(activeRoleData.type)}
                  {activeRoleData?.context || 'Role Details'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Role-specific content based on activeRoleData */}
                {activeRoleData?.type === 'player' && (
                  <div className="space-y-4">
                    <p>Player performance and statistics</p>
                    {/* Add player-specific content */}
                  </div>
                )}
                
                {activeRoleData?.type === 'parent' && (
                  <div className="space-y-4">
                    <p>Children's activities and performance</p>
                    {/* Add parent-specific content */}
                  </div>
                )}
                
                {activeRoleData?.type === 'staff' && (
                  <div className="space-y-4">
                    <p>Team management and coaching tools</p>
                    {/* Add staff-specific content */}
                  </div>
                )}
                
                {activeRoleData?.type === 'admin' && (
                  <div className="space-y-4">
                    <p>Administrative controls and system management</p>
                    {/* Add admin-specific content */}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <RoleAwareCalendar 
            userId={effectiveUserId}
            activeRole={activeRole}
            userRoles={userRoles}
          />
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Statistics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showEditModal && (
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showLinkedAccounts && (
        <UnifiedLinkedAccounts
          isOpen={showLinkedAccounts}
          onClose={() => setShowLinkedAccounts(false)}
          onUpdate={loadProfileData}
        />
      )}
    </div>
  );
};