import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  User,
  Crown,
  Shield,
  Star,
  Settings
} from 'lucide-react';
import { UnifiedProfile } from './UnifiedProfile';
import { UserInvitationModal } from './UserInvitationModal';
import { useAuthorization } from '@/contexts/AuthorizationContext';

interface EnhancedUserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  created_at: string;
  roleContexts: {
    type: 'player' | 'parent' | 'staff' | 'admin';
    context: string;
    count: number;
  }[];
  lastActivity?: string;
}

export const EnhancedUserManagement = () => {
  const [users, setUsers] = useState<EnhancedUserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<EnhancedUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { isGlobalAdmin } = useAuthorization();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Load all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (!profiles) {
        setUsers([]);
        return;
      }

      // For each user, load their role contexts
      const enhancedUsers: EnhancedUserProfile[] = [];

      // Preload staff roles for all users
      const profileIds = profiles.map((p) => p.id);
      const { data: staffRoles, error: staffRolesError } = await supabase
        .from('user_teams')
        .select('user_id, team_id, role, teams!user_teams_team_id_fkey (name)')
        .in('user_id', profileIds);
      if (staffRolesError) {
        console.error('Error loading staff roles:', staffRolesError);
      }

      for (const profile of profiles) {
        const roleContexts: { type: 'player' | 'parent' | 'staff' | 'admin'; context: string; count: number; }[] = [];

        // Check player roles
        const { data: playerData } = await supabase
          .from('user_players')
          .select(`
            relationship,
            players!inner(name, teams!inner(name))
          `)
          .eq('user_id', profile.id);

        if (playerData) {
          const playerRoles = playerData.filter(p => p.relationship === 'self');
          const parentRoles = playerData.filter(p => p.relationship === 'parent');

          if (playerRoles.length > 0) {
            roleContexts.push({
              type: 'player',
              context: `Player in ${playerRoles.length} team${playerRoles.length > 1 ? 's' : ''}`,
              count: playerRoles.length
            });
          }

          if (parentRoles.length > 0) {
            roleContexts.push({
              type: 'parent',
              context: `Parent of ${parentRoles.length} player${parentRoles.length > 1 ? 's' : ''}`,
              count: parentRoles.length
            });
          }
        }

        // Check staff roles via user_teams (preloaded) and dedupe by team
        const staffRows = (staffRoles || []).filter(
          (sr: any) => sr.user_id === profile.id && ['manager','team_manager','team_assistant_manager','team_coach','team_helper'].includes(sr.role)
        );
        const rolePriority: Record<string, number> = {
          manager: 4,
          team_manager: 4,
          team_assistant_manager: 3,
          team_coach: 2,
          team_helper: 1,
        };
        const teamsMap = new Map<string, any>();
        for (const sr of staffRows) {
          const existing = teamsMap.get(sr.team_id);
          if (!existing || (rolePriority[sr.role] || 0) > (rolePriority[existing.role] || 0)) {
            teamsMap.set(sr.team_id, sr);
          }
        }
        const uniqueTeamStaff = Array.from(teamsMap.values());

        if (uniqueTeamStaff.length > 0) {
          if (uniqueTeamStaff.length === 1) {
            const sr: any = uniqueTeamStaff[0];
            const roleName = sr.role.replace(/_/g, ' ');
            const teamName = sr.teams?.name;
            roleContexts.push({
              type: 'staff',
              context: `${roleName.charAt(0).toUpperCase() + roleName.slice(1)}${teamName ? ` at ${teamName}` : ''}`,
              count: 1
            });
          } else {
            roleContexts.push({
              type: 'staff',
              context: `Staff in ${uniqueTeamStaff.length} teams`,
              count: uniqueTeamStaff.length
            });
          }
        }


        // Check admin roles
        if (profile.roles?.includes('global_admin')) {
          roleContexts.push({
            type: 'admin',
            context: 'Global Administrator',
            count: 1
          });
        }

        if (profile.roles?.includes('club_admin')) {
          roleContexts.push({
            type: 'admin',
            context: 'Club Administrator',
            count: 1
          });
        }

        enhancedUsers.push({
          id: profile.id,
          name: profile.name || 'Unknown',
          email: profile.email || '',
          phone: profile.phone,
          roles: profile.roles || [],
          created_at: profile.created_at,
          roleContexts
        });
      }

      setUsers(enhancedUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
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
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (roleFilter === 'admin') {
          return user.roles.includes('global_admin') || user.roles.includes('club_admin');
        }
        return user.roleContexts.some(context => context.type === roleFilter);
      });
    }

    setFilteredUsers(filtered);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (type: string) => {
    switch (type) {
      case 'player': return <User className="h-3 w-3" />;
      case 'parent': return <Users className="h-3 w-3" />;
      case 'staff': return <Shield className="h-3 w-3" />;
      case 'admin': return <Crown className="h-3 w-3" />;
      default: return <Star className="h-3 w-3" />;
    }
  };

  const getRoleBadgeColor = (type: string) => {
    switch (type) {
      case 'player': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'parent': return 'bg-green-100 text-green-800 border-green-200';
      case 'staff': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (selectedUser) {
    return (
      <div>
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setSelectedUser(null)}
            className="mb-4"
          >
            ← Back to User List
          </Button>
        </div>
        <UnifiedProfile userId={selectedUser} viewMode="admin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-6 w-6" />
              User Management
            </CardTitle>
            {isGlobalAdmin && (
              <Button 
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invite User
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="player">Players</SelectItem>
                  <SelectItem value="parent">Parents</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Administrators</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No users found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card 
              key={user.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedUser(user.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-sm font-semibold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{user.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                      {user.phone && (
                        <p className="text-xs text-muted-foreground">
                          {user.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUser(user.id);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>

                {/* Role Contexts */}
                <div className="space-y-2">
                  {user.roleContexts.length > 0 ? (
                    user.roleContexts.map((context, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className={`text-xs ${getRoleBadgeColor(context.type)}`}
                      >
                        {getRoleIcon(context.type)}
                        <span className="ml-1">{context.context}</span>
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      No active roles
                    </Badge>
                  )}
                </div>

                {/* Admin badges */}
                {user.roles.includes('global_admin') && (
                <Badge className="mt-2 bg-red-100 text-red-800 border-red-200">
                  <Crown className="h-3 w-3 mr-1" />
                  Global Administrator
                </Badge>
                )}

                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <UserInvitationModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInviteSent={() => {
            setShowInviteModal(false);
            loadUsers();
          }}
        />
      )}
    </div>
  );
};