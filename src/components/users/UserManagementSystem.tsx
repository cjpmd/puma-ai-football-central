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
import { Users, UserPlus, Search, Filter, Mail, Phone, Calendar, Shield, Link2, RefreshCw, UserCheck, Bug, CheckCircle, UserSearch, Trash2 } from 'lucide-react';
import { UserInvitationModal } from './UserInvitationModal';
import { UserLinkingPanel } from './UserLinkingPanel';
import { DualRoleManagement } from './DualRoleManagement';
import { BulkUserImport } from './BulkUserImport';
import { InvitationResendPanel } from './InvitationResendPanel';
import { UserTeamManagement } from './UserTeamManagement';
import { UserEditModal } from './UserEditModal';
import { userInvitationService } from '@/services/userInvitationService';

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
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const fixSpecificUser = async () => {
    const targetUserId = '9eb48f9d-a697-4863-80e1-9a648ede7836';
    const targetEmail = 'dcjpm001@gmail.com';
    
    try {
      console.log('=== FIXING SPECIFIC USER:', targetUserId, '===');
      console.log('Current user:', user);
      console.log('Current profile:', profile);
      
      // Check if current user is global admin
      if (!profile?.roles?.includes('global_admin')) {
        throw new Error('You must be a global admin to perform this action');
      }
      
      // Check if profile already exists using maybeSingle to avoid errors
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      console.log('Profile check result:', { existingProfile, profileCheckError });

      if (profileCheckError) {
        console.error('Error checking profile:', profileCheckError);
        throw profileCheckError;
      }

      // If no profile exists, create one
      if (!existingProfile) {
        console.log('No profile found, creating one...');
        
        // Get invitations to get user details
        const { data: invitations, error: invitationError } = await supabase
          .from('user_invitations')
          .select('*')
          .eq('email', targetEmail)
          .order('created_at', { ascending: true });

        if (invitationError) {
          console.error('Error fetching invitations:', invitationError);
          throw invitationError;
        }

        if (!invitations || invitations.length === 0) {
          throw new Error('No invitations found for this email');
        }

        console.log('Found invitations:', invitations);
        const firstInvitation = invitations[0];
        
        // Create the missing profile using insert (since upsert might have issues with RLS)
        console.log('Creating missing profile for user:', targetUserId);
        
        // First try with direct insert
        const { data: newProfile, error: createProfileError } = await supabase
          .from('profiles')
          .insert([{
            id: targetUserId,
            name: firstInvitation.name,
            email: firstInvitation.email,
            roles: [firstInvitation.role]
          }])
          .select()
          .single();

        if (createProfileError) {
          console.error('Error creating profile with direct insert:', createProfileError);
          
          // If direct insert fails, try with RPC call as backup
          console.log('Attempting alternative profile creation method...');
          const { data: rpcResult, error: rpcError } = await supabase.rpc('user_is_global_admin');
          console.log('Global admin check result:', rpcResult);
          
          if (rpcError || !rpcResult) {
            throw new Error('Global admin verification failed. Please ensure you have proper permissions.');
          }
          
          // Try upsert as last resort
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert([{
              id: targetUserId,
              name: firstInvitation.name,
              email: firstInvitation.email,
              roles: [firstInvitation.role]
            }], {
              onConflict: 'id'
            });
            
          if (upsertError) {
            console.error('Error with upsert:', upsertError);
            throw new Error(`Failed to create profile: ${upsertError.message}`);
          }
        }
        
        console.log('Profile created successfully');
      } else {
        console.log('Profile already exists:', existingProfile);
      }

      // Process all pending invitations for this email
      console.log('Processing all pending invitations for:', targetEmail);
      const result = await userInvitationService.processUserInvitation(targetEmail);
      console.log('Processing result:', result);

      // Reload users to see the changes
      await loadUsers();
      
      toast({
        title: 'User Fixed Successfully',
        description: `User ${targetEmail} has been processed. ${result.message}`,
      });
      
    } catch (error: any) {
      console.error('Fix user error:', error);
      toast({
        title: 'Fix User Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const debugSpecificUser = async () => {
    const targetUserId = '9eb48f9d-a697-4863-80e1-9a648ede7836';
    
    try {
      console.log('=== DEBUGGING SPECIFIC USER:', targetUserId, '===');
      
      // Check profiles table directly
      console.log('1. Checking profiles table for user ID...');
      const { data: profileById, error: profileIdError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId);
      
      console.log('Profile by ID query result:', { profileById, profileIdError });

      // Check invitations for this user
      console.log('2. Checking user_invitations for user ID...');
      const { data: invitationsByUserId, error: invitationUserError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('accepted_by', targetUserId);
      
      console.log('Invitations by user ID query result:', { invitationsByUserId, invitationUserError });

      // Check all profiles to see what we get
      console.log('3. Checking all profiles...');
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('Recent profiles:', { allProfiles, allProfilesError });

      // Check for the specific email in invitations
      console.log('4. Checking user_invitations by email...');
      const { data: invitationsByEmail, error: invitationEmailError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('email', 'dcjpm001@gmail.com');
      
      console.log('Invitations by email query result:', { invitationsByEmail, invitationEmailError });

      toast({
        title: 'Debug Complete for ' + targetUserId,
        description: 'Check console for detailed information about this user',
      });
      
    } catch (error: any) {
      console.error('Debug error:', error);
      toast({
        title: 'Debug Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const processPendingInvitations = async () => {
    try {
      console.log('Processing pending invitations...');
      
      // Get all pending invitations
      const { data: pendingInvitations, error: invitationError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('status', 'pending');

      if (invitationError) {
        throw invitationError;
      }

      console.log('Found pending invitations:', pendingInvitations);

      let processedCount = 0;

      // Check each pending invitation to see if the user has signed up
      for (const invitation of pendingInvitations || []) {
        try {
          const result = await userInvitationService.processUserInvitation(invitation.email);
          if (result.processed) {
            processedCount++;
          }
        } catch (error) {
          console.error(`Error processing invitation for ${invitation.email}:`, error);
        }
      }

      // Reload users after processing
      await loadUsers();
      
      toast({
        title: 'Processing Complete',
        description: `${processedCount} pending invitations have been processed and users can now see their team data.`,
      });

    } catch (error: any) {
      console.error('Error processing pending invitations:', error);
      toast({
        title: 'Processing Error',
        description: error.message || 'Failed to process pending invitations',
        variant: 'destructive',
      });
    }
  };

  const syncMissingProfiles = async () => {
    try {
      console.log('Syncing missing profiles from auth users...');
      
      // Get current user (must be admin to do this)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get all accepted invitations where user doesn't have a profile
      const { data: invitations, error: invError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('status', 'accepted');

      if (invError) {
        console.error('Error fetching invitations:', invError);
        throw invError;
      }

      console.log('Found accepted invitations:', invitations);

      let profilesCreated = 0;

      // Check if profiles exist for these users
      for (const invitation of invitations || []) {
        if (invitation.accepted_by) {
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', invitation.accepted_by)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            console.log('Creating missing profile for user:', invitation.accepted_by);
            
            const { error: createError } = await supabase
              .from('profiles')
              .insert([{
                id: invitation.accepted_by,
                name: invitation.name,
                email: invitation.email,
                roles: [invitation.role]
              }]);

            if (createError) {
              console.error('Error creating profile:', createError);
            } else {
              console.log('Profile created successfully for:', invitation.email);
              profilesCreated++;
            }
          } else if (existingProfile) {
            console.log('Profile already exists for:', invitation.email);
          }
        }
      }

      // Reload users after sync
      await loadUsers();
      
      toast({
        title: 'Sync Complete',
        description: `${profilesCreated} missing user profiles have been synchronized.`,
      });
    } catch (error: any) {
      console.error('Error syncing profiles:', error);
      toast({
        title: 'Sync Error',
        description: error.message || 'Failed to sync user profiles',
        variant: 'destructive',
      });
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('Loading users...');

      // Get all profiles with basic info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Profiles found:', profiles?.length || 0);
      console.log('All profiles:', profiles);

      if (!profiles || profiles.length === 0) {
        console.log('No profiles found');
        setUsers([]);
        return;
      }

      // Get user-team relationships
      const { data: userTeamsData, error: userTeamsError } = await supabase
        .from('user_teams')
        .select('user_id, role, team_id');

      if (userTeamsError) console.error('Error fetching user teams:', userTeamsError);

      // Get teams data using the correct foreign key
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name');

      if (teamsError) console.error('Error fetching teams:', teamsError);

      // Get user-club relationships
      const { data: userClubsData, error: userClubsError } = await supabase
        .from('user_clubs')
        .select('user_id, role, club_id');

      if (userClubsError) console.error('Error fetching user clubs:', userClubsError);

      // Get clubs data
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('id, name');

      if (clubsError) console.error('Error fetching clubs:', clubsError);

      // Get user-player relationships
      const { data: userPlayersData, error: userPlayersError } = await supabase
        .from('user_players')
        .select('user_id, relationship, player_id');

      if (userPlayersError) console.error('Error fetching user players:', userPlayersError);

      // Get players data
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, team_id');

      if (playersError) console.error('Error fetching players:', playersError);

      // Get user-staff relationships
      const { data: userStaffData, error: userStaffError } = await supabase
        .from('user_staff')
        .select('user_id, relationship, staff_id');

      if (userStaffError) console.error('Error fetching user staff:', userStaffError);

      // Get staff data
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
          name: profile.name || 'Unknown User',
          email: profile.email || 'No Email',
          phone: profile.phone,
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
        title: 'Error Loading Users',
        description: error.message || 'Failed to load user data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.roles.some(role => role.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user =>
        user.roles.some(role => role.toLowerCase().includes(roleFilter.toLowerCase()))
      );
    }

    setFilteredUsers(filtered);
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: 'bg-red-500',
      team_manager: 'bg-blue-500',
      team_assistant_manager: 'bg-blue-400',
      team_coach: 'bg-green-500',
      team_helper: 'bg-yellow-500',
      parent: 'bg-purple-500',
      player: 'bg-gray-500',
      club_admin: 'bg-orange-500',
      club_chair: 'bg-pink-500',
      club_secretary: 'bg-indigo-500',
      global_admin: 'bg-black'
    };
    return roleColors[role] || 'bg-gray-400';
  };

  const formatRoleName = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleEditUser = (userToEdit: UserProfile) => {
    console.log('Opening edit modal for user:', userToEdit);
    setEditingUser(userToEdit);
    setShowEditModal(true);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`Are you sure you want to delete user ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'User Deleted',
        description: `${user.name} has been deleted successfully`,
      });

      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Delete Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const [activeTab, setActiveTab] = useState('users');

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
        <div className="flex gap-2">
          <Button
            onClick={fixSpecificUser}
            variant="outline"
            size="sm"
            className="bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Fix Missing User
          </Button>
          <Button
            onClick={loadUsers}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={debugSpecificUser}
            variant="outline"
            size="sm"
            className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug User
          </Button>
          <Button
            onClick={processPendingInvitations}
            variant="outline"
            size="sm"
            className="bg-green-50 border-green-200 text-green-800 hover:bg-green-100"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Process Pending
          </Button>
          <Button
            onClick={syncMissingProfiles}
            variant="outline"
            size="sm"
            className="bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
          >
            <UserSearch className="h-4 w-4 mr-2" />
            Sync Missing Profiles
          </Button>
          <Button
            onClick={() => setShowInviteModal(true)}
            className="bg-puma-blue-600 hover:bg-puma-blue-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users">Active Users ({filteredUsers.length})</TabsTrigger>
          <TabsTrigger value="team-management">Team Management</TabsTrigger>
          <TabsTrigger value="invitations">Invite</TabsTrigger>
          <TabsTrigger value="teams">Team</TabsTrigger>
          <TabsTrigger value="linking">Link</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <div className="space-y-6">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Users List */}
            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-puma-blue-100 text-puma-blue-800">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {user.name}
                          </h3>
                          {user.roles.map((role) => (
                            <Badge
                              key={role}
                              className={`${getRoleColor(role)} text-white text-xs`}
                            >
                              {formatRoleName(role)}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Teams and Clubs */}
                        {(user.teams.length > 0 || user.clubs.length > 0) && (
                          <div className="mt-3 space-y-2">
                            {user.teams.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">Teams:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                   {user.teams.map((team, index) => (
                                     <Badge key={`${team.id}-${index}`} variant="outline" className="text-xs">
                                       {team.name} ({team.role})
                                     </Badge>
                                   ))}
                                </div>
                              </div>
                            )}
                            {user.clubs.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">Clubs:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                   {user.clubs.map((club, index) => (
                                     <Badge key={`${club.id}-${index}`} variant="outline" className="text-xs">
                                       {club.name} ({club.role})
                                     </Badge>
                                   ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Player and Staff Links */}
                        {(user.playerLinks.length > 0 || user.staffLinks.length > 0) && (
                          <div className="mt-3 space-y-2">
                            {user.playerLinks.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">Player Links:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                   {user.playerLinks.map((link, index) => (
                                     <Badge key={`${link.id}-${index}`} variant="secondary" className="text-xs">
                                       <Link2 className="h-3 w-3 mr-1" />
                                       {link.name} ({link.relationship})
                                     </Badge>
                                   ))}
                                </div>
                              </div>
                            )}
                            {user.staffLinks.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">Staff Links:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                   {user.staffLinks.map((link, index) => (
                                     <Badge key={`${link.id}-${index}`} variant="secondary" className="text-xs">
                                       <Shield className="h-3 w-3 mr-1" />
                                       {link.name} ({link.relationship})
                                     </Badge>
                                   ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Action buttons for each user */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                            className="flex items-center gap-2"
                          >
                            <Users className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteUser(user)}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {filteredUsers.length === 0 && (
                <Card className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || roleFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'No users have been added to the system yet.'
                    }
                  </p>
                  {!searchTerm && roleFilter === 'all' && (
                    <Button 
                      onClick={loadUsers}
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh User List
                    </Button>
                  )}
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team-management" className="mt-6">
          <UserTeamManagement />
        </TabsContent>

        <TabsContent value="invitations" className="mt-6">
          <InvitationResendPanel />
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <DualRoleManagement />
        </TabsContent>

        <TabsContent value="linking" className="mt-6">
          <UserLinkingPanel />
        </TabsContent>

        <TabsContent value="open" className="mt-6">
          <BulkUserImport />
        </TabsContent>
      </Tabs>

      <UserInvitationModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={loadUsers}
      />
      
      <UserEditModal
        user={editingUser}
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        onUserUpdated={loadUsers}
      />
    </div>
  );
};