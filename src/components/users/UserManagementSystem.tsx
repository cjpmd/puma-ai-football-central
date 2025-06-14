import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserPlus, Search, Filter, Mail, Phone, Calendar, Shield, Link2 } from 'lucide-react';
import { UserInvitationModal } from './UserInvitationModal';
import { UserLinkingPanel } from './UserLinkingPanel';
import { DualRoleManagement } from './DualRoleManagement';
import { BulkUserImport } from './BulkUserImport';
import { InvitationResendPanel } from './InvitationResendPanel';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  created_at: string;
  teams: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  clubs: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  playerLinks: Array<{
    id: string;
    name: string;
    team: string;
    relationship: string;
  }>;
  staffLinks: Array<{
    id: string;
    name: string;
    team: string;
    role: string;
    relationship: string;
  }>;
}

export const UserManagementSystem = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('Loading users...');

      // Get all profiles with basic info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        return;
      }

      // Get user-team relationships separately
      const { data: userTeamsData, error: userTeamsError } = await supabase
        .from('user_teams')
        .select('user_id, role, team_id');

      if (userTeamsError) console.error('Error fetching user teams:', userTeamsError);

      // Get teams data separately
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name');

      if (teamsError) console.error('Error fetching teams:', teamsError);

      // Get user-club relationships separately
      const { data: userClubsData, error: userClubsError } = await supabase
        .from('user_clubs')
        .select('user_id, role, club_id');

      if (userClubsError) console.error('Error fetching user clubs:', userClubsError);

      // Get clubs data separately
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('id, name');

      if (clubsError) console.error('Error fetching clubs:', clubsError);

      // Get user-player relationships
      const { data: userPlayersData, error: userPlayersError } = await supabase
        .from('user_players')
        .select('user_id, relationship, player_id');

      if (userPlayersError) console.error('Error fetching user players:', userPlayersError);

      // Get players data separately
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, team_id');

      if (playersError) console.error('Error fetching players:', playersError);

      // Get user-staff relationships
      const { data: userStaffData, error: userStaffError } = await supabase
        .from('user_staff')
        .select('user_id, relationship, staff_id');

      if (userStaffError) console.error('Error fetching user staff:', userStaffError);

      // Get staff data separately
      const { data: staffData, error: staffError } = await supabase
        .from('team_staff')
        .select('id, name, role, team_id');

      if (staffError) console.error('Error fetching staff:', staffError);

      // Process and combine all data
      const processedUsers: UserProfile[] = profiles.map(profile => {
        // Map user teams
        const userTeams = (userTeamsData || [])
          .filter(ut => ut.user_id === profile.id)
          .map(ut => {
            const team = (teamsData || []).find(t => t.id === ut.team_id);
            return {
              id: team?.id || '',
              name: team?.name || 'Unknown Team',
              role: ut.role
            };
          });

        // Map user clubs
        const userClubs = (userClubsData || [])
          .filter(uc => uc.user_id === profile.id)
          .map(uc => {
            const club = (clubsData || []).find(c => c.id === uc.club_id);
            return {
              id: club?.id || '',
              name: club?.name || 'Unknown Club',
              role: uc.role
            };
          });

        // Map user players
        const userPlayers = (userPlayersData || [])
          .filter(up => up.user_id === profile.id)
          .map(up => {
            const player = (playersData || []).find(p => p.id === up.player_id);
            const team = player ? (teamsData || []).find(t => t.id === player.team_id) : null;
            return {
              id: player?.id || '',
              name: player?.name || 'Unknown Player',
              team: team?.name || 'Unknown Team',
              relationship: up.relationship
            };
          });

        // Map user staff
        const userStaffMembers = (userStaffData || [])
          .filter(us => us.user_id === profile.id)
          .map(us => {
            const staff = (staffData || []).find(s => s.id === us.staff_id);
            const team = staff ? (teamsData || []).find(t => t.id === staff.team_id) : null;
            return {
              id: staff?.id || '',
              name: staff?.name || 'Unknown Staff',
              team: team?.name || 'Unknown Team',
              role: staff?.role || 'Unknown Role',
              relationship: us.relationship
            };
          });

        return {
          id: profile.id,
          name: profile.name || 'Unknown',
          email: profile.email || '',
          phone: profile.phone || '',
          roles: Array.isArray(profile.roles) ? profile.roles : [],
          created_at: profile.created_at,
          teams: userTeams,
          clubs: userClubs,
          playerLinks: userPlayers,
          staffLinks: userStaffMembers
        };
      });

      console.log('Processed users:', processedUsers);
      setUsers(processedUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user =>
        user.roles.includes(roleFilter)
      );
    }

    setFilteredUsers(filtered);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'global_admin': return 'bg-red-500';
      case 'club_admin': return 'bg-blue-500';
      case 'team_manager': return 'bg-green-500';
      case 'coach': return 'bg-purple-500';
      case 'staff': return 'bg-orange-500';
      case 'parent': return 'bg-pink-500';
      case 'player': return 'bg-cyan-500';
      default: return 'bg-gray-500';
    }
  };

  const formatRoleName = (role: string): string => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const [activeTab, setActiveTab] = useState('invitations');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions across your organization
          </p>
        </div>
        <Button
          onClick={() => setShowInviteModal(true)}
          className="bg-puma-blue-500 hover:bg-puma-blue-600"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="invitations">Invite</TabsTrigger>
        </TabsList>

        <TabsContent value="invitations" className="mt-6">
          <InvitationResendPanel />
        </TabsContent>
      </Tabs>

      <UserInvitationModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={loadUsers}
      />
    </div>
  );
};
