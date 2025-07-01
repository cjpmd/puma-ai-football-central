
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserPlus, Search, Filter, Mail, Phone, Calendar, Shield, Link2, RefreshCw, UserCheck, Bug, CheckCircle, UserSearch, Unlink, AlertTriangle } from 'lucide-react';
import { UserInvitationModal } from './UserInvitationModal';
import { UserLinkingPanel } from './UserLinkingPanel';
import { DualRoleManagement } from './DualRoleManagement';
import { BulkUserImport } from './BulkUserImport';
import { InvitationResendPanel } from './InvitationResendPanel';
import { UserTeamManagement } from './UserTeamManagement';
import { EnhancedUserLinking } from './EnhancedUserLinking';
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

interface RoleOption {
  value: string;
  label: string;
  description: string;
  restricted?: boolean;
}

const roleOptions: RoleOption[] = [
  { value: 'global_admin', label: 'Global Admin', description: 'Full system access', restricted: true },
  { value: 'club_admin', label: 'Club Admin', description: 'Manage club and teams' },
  { value: 'team_manager', label: 'Team Manager', description: 'Manage team operations' },
  { value: 'team_assistant_manager', label: 'Assistant Manager', description: 'Assist with team management' },
  { value: 'team_coach', label: 'Coach', description: 'Coach team and manage training' },
  { value: 'team_helper', label: 'Team Helper', description: 'Support team activities' },
  { value: 'parent', label: 'Parent', description: 'Parent of a player' },
  { value: 'player', label: 'Player', description: 'Team player' },
  { value: 'club_chair', label: 'Club Chair', description: 'Club chairperson' },
  { value: 'club_secretary', label: 'Club Secretary', description: 'Club secretary' }
];

// Utility functions
const getRoleColor = (role: string): string => {
  switch (role) {
    case 'global_admin':
      return 'bg-red-600';
    case 'club_admin':
      return 'bg-purple-600';
    case 'team_manager':
      return 'bg-blue-600';
    case 'team_assistant_manager':
      return 'bg-blue-500';
    case 'team_coach':
      return 'bg-green-600';
    case 'team_helper':
      return 'bg-green-500';
    case 'parent':
      return 'bg-orange-600';
    case 'player':
      return 'bg-yellow-600';
    case 'club_chair':
      return 'bg-purple-700';
    case 'club_secretary':
      return 'bg-purple-500';
    default:
      return 'bg-gray-600';
  }
};

const formatRoleName = (role: string): string => {
  return role.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export const UserManagementSystem = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    phone: '',
    roles: [] as string[]
  });
  const { toast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('Loading users with links...');
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        return;
      }

      // Get user-player links
      const { data: userPlayerLinks, error: playerLinksError } = await supabase
        .from('user_players')
        .select(`
          user_id,
          relationship,
          players!inner(
            id,
            name,
            teams!inner(name)
          )
        `);

      if (playerLinksError) {
        console.error('Error fetching player links:', playerLinksError);
      }

      // Get user-staff links
      const { data: userStaffLinks, error: staffLinksError } = await supabase
        .from('user_staff')
        .select(`
          user_id,
          relationship,
          team_staff!inner(
            id,
            name,
            role,
            teams!inner(name)
          )
        `);

      if (staffLinksError) {
        console.error('Error fetching staff links:', staffLinksError);
      }

      // Process users with their links
      const processedUsers: UserProfile[] = profiles.map(profile => {
        // Find player links for this user
        const playerLinks = (userPlayerLinks || [])
          .filter(link => link.user_id === profile.id)
          .map(link => ({
            id: (link as any).players.id,
            name: (link as any).players.name,
            team: (link as any).players.teams?.name || 'Unknown Team',
            relationship: link.relationship
          }));

        // Find staff links for this user
        const staffLinks = (userStaffLinks || [])
          .filter(link => link.user_id === profile.id)
          .map(link => ({
            id: (link as any).team_staff.id,
            name: (link as any).team_staff.name,
            team: (link as any).team_staff.teams?.name || 'Unknown Team',
            role: (link as any).team_staff.role,
            relationship: link.relationship
          }));

        return {
          id: profile.id,
          name: profile.name || 'Unknown',
          email: profile.email || '',
          phone: profile.phone || '',
          roles: Array.isArray(profile.roles) ? profile.roles : [],
          created_at: profile.created_at,
          teams: [],
          clubs: [],
          playerLinks,
          staffLinks
        };
      });

      console.log('Processed users with links:', processedUsers.length);
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

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user =>
        user.roles.includes(roleFilter)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleRemovePlayerLink = async (userId: string, playerId: string) => {
    try {
      const { error } = await supabase
        .from('user_players')
        .delete()
        .eq('user_id', userId)
        .eq('player_id', playerId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Player link removed successfully',
      });

      await loadUsers();
    } catch (error: any) {
      console.error('Error removing player link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove player link',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveStaffLink = async (userId: string, staffId: string) => {
    try {
      const { error } = await supabase
        .from('user_staff')
        .delete()
        .eq('user_id', userId)
        .eq('staff_id', staffId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Staff link removed successfully',
      });

      await loadUsers();
    } catch (error: any) {
      console.error('Error removing staff link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove staff link',
        variant: 'destructive',
      });
    }
  };

  const handleCreateMissingProfile = async () => {
    try {
      const email = prompt('Enter the email of the user who has signed up but is missing a profile:');
      if (!email) return;

      // First check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        toast({
          title: 'Profile Already Exists',
          description: 'A profile already exists for this email address.',
          variant: 'destructive',
        });
        return;
      }

      // Check if user exists in auth.users table
      const { data: { users: authUsers }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error('Error checking auth users:', usersError);
        toast({
          title: 'Error',
          description: 'Cannot access user data. You may not have sufficient permissions.',
          variant: 'destructive',
        });
        return;
      }

      const authUser = authUsers?.find(u => u.email === email);
      
      if (!authUser) {
        toast({
          title: 'User Not Found',
          description: 'No authenticated user found with this email. The user needs to sign up first.',
          variant: 'destructive',
        });
        return;
      }

      // Create profile with the auth user's ID
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Unknown User',
          roles: ['player'] // default role
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        toast({
          title: 'Error',
          description: profileError.message || 'Failed to create profile',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `Profile created for ${email}`,
      });
      
      await loadUsers();
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create profile',
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (userToEdit: UserProfile) => {
    setEditingUser(userToEdit);
    setNewUserData({
      name: userToEdit.name,
      email: userToEdit.email,
      phone: userToEdit.phone || '',
      roles: [...userToEdit.roles]
    });
    setShowEditModal(true);
  };

  const handleRoleToggle = (role: string, checked: boolean) => {
    setNewUserData(prev => ({
      ...prev,
      roles: checked 
        ? [...prev.roles, role]
        : prev.roles.filter(r => r !== role)
    }));
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: newUserData.name,
          email: newUserData.email,
          phone: newUserData.phone,
          roles: newUserData.roles
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      setShowEditModal(false);
      setEditingUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

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
            onClick={handleCreateMissingProfile}
            variant="outline"
            size="sm"
            className="bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100"
            title="Creates a profile for users who have signed up but are missing profile records. Only use if user has successfully registered but profile is missing."
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Create Missing Profile
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
            onClick={() => setShowInviteModal(true)}
            className="bg-puma-blue-500 hover:bg-puma-blue-600"
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
          <TabsTrigger value="enhanced-linking">Enhanced Linking</TabsTrigger>
          <TabsTrigger value="linking">Link</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roleOptions.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 mt-6">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
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

                      {(user.playerLinks.length > 0 || user.staffLinks.length > 0) && (
                        <div className="mt-3 space-y-2">
                          {user.playerLinks.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Player Links:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {user.playerLinks.map((link) => (
                                  <Badge key={link.id} variant="secondary" className="text-xs">
                                    <Link2 className="h-3 w-3 mr-1" />
                                    {link.name} ({link.relationship})
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemovePlayerLink(user.id, link.id)}
                                      className="text-red-600 hover:text-red-700 ml-1 p-0 h-auto"
                                    >
                                      <Unlink className="h-3 w-3" />
                                    </Button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {user.staffLinks.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Staff Links:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {user.staffLinks.map((link) => (
                                  <Badge key={link.id} variant="secondary" className="text-xs">
                                    <Shield className="h-3 w-3 mr-1" />
                                    {link.name} ({link.role})
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemoveStaffLink(user.id, link.id)}
                                      className="text-red-600 hover:text-red-700 ml-1 p-0 h-auto"
                                    >
                                      <Unlink className="h-3 w-3" />
                                    </Button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(user)}
                  >
                    Edit
                  </Button>
                </div>
              </Card>
            ))}

            {filteredUsers.length === 0 && (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-600">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'No users have been added to the system yet.'}
                </p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="team-management" className="mt-6">
          <UserTeamManagement />
        </TabsContent>

        <TabsContent value="invitations" className="mt-6">
          <InvitationResendPanel />
        </TabsContent>

        <TabsContent value="enhanced-linking" className="mt-6">
          <EnhancedUserLinking />
        </TabsContent>

        <TabsContent value="linking" className="mt-6">
          <UserLinkingPanel />
        </TabsContent>

        <TabsContent value="open" className="mt-6">
          <BulkUserImport />
        </TabsContent>
      </Tabs>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information, roles, and manage links.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={newUserData.name}
                onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone</Label>
              <Input
                id="editPhone"
                value={newUserData.phone}
                onChange={(e) => setNewUserData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {roleOptions.map((role) => {
                  const isRestricted = role.restricted && newUserData.email !== 'chrisjpmcdonald@gmail.com';
                  const isChecked = newUserData.roles.includes(role.value);
                  
                  return (
                    <div key={role.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={role.value}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleRoleToggle(role.value, checked as boolean)}
                        disabled={isRestricted}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor={role.value}
                          className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                            isRestricted ? 'text-gray-400' : ''
                          }`}
                        >
                          {role.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {role.description}
                          {isRestricted && ' (Restricted)'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {newUserData.email !== 'chrisjpmcdonald@gmail.com' && (
                <p className="text-xs text-muted-foreground">
                  Global Admin role is restricted to chrisjpmcdonald@gmail.com
                </p>
              )}
            </div>

            {editingUser && (editingUser.playerLinks.length > 0 || editingUser.staffLinks.length > 0) && (
              <div className="space-y-3">
                <Label>Current Links</Label>
                
                {editingUser.playerLinks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Player Links:</h4>
                    <div className="space-y-2">
                      {editingUser.playerLinks.map((link) => (
                        <div key={link.id} className="flex items-center justify-between bg-green-50 p-2 rounded">
                          <div className="flex items-center space-x-2">
                            <Link2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm">
                              {link.name} ({link.team}) - {link.relationship}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemovePlayerLink(editingUser.id, link.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editingUser.staffLinks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Staff Links:</h4>
                    <div className="space-y-2">
                      {editingUser.staffLinks.map((link) => (
                        <div key={link.id} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">
                              {link.name} ({link.role}, {link.team}) - {link.relationship}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveStaffLink(editingUser.id, link.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdateUser}>Update User</Button>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UserInvitationModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={loadUsers}
      />
    </div>
  );
};
