
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Edit, Trash2, UserPlus, Mail, RefreshCw } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  fa_id?: string;
  created_at: string;
  updated_at: string;
  staffTeams?: { role: string; teamName: string }[];
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    phone: '',
    roles: ['player'] as string[]
  });
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      console.log('Loading all users...');
      setLoading(true);
      
      // Load profiles with their staff roles from user_teams
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        throw profilesError;
      }

      // Load staff roles for all users
      const { data: staffRoles, error: staffError } = await supabase
        .from('user_teams')
        .select(`
          user_id,
          role,
          team_id,
          teams!user_teams_team_id_fkey (name)
        `);

      if (staffError) {
        console.error('Error loading staff roles:', staffError);
        // Don't throw here, continue without staff roles
      }

      // Enhance users with their staff roles
      const enhancedUsers = (profilesData || []).map(user => {
        const userStaffRoles = staffRoles?.filter(sr => sr.user_id === user.id) || [];
        const staffRoleNames = userStaffRoles.map(sr => sr.role);
        
        // Combine profile roles with staff roles, removing duplicates
        const allRoles = [...(user.roles || []), ...staffRoleNames];
        const uniqueRoles = Array.from(new Set(allRoles));

        return {
          ...user,
          roles: uniqueRoles,
          staffTeams: userStaffRoles.map(sr => ({ role: sr.role, teamName: sr.teams?.name || 'Unknown Team' }))
        };
      });

      console.log('Loaded enhanced users:', enhancedUsers);
      setUsers(enhancedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      console.log('Updating user:', editingUser.id, newUserData);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: newUserData.name,
          email: newUserData.email,
          phone: newUserData.phone || null,
          roles: newUserData.roles,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      await loadUsers();
      setIsEditModalOpen(false);
      setEditingUser(null);
      setNewUserData({ name: '', email: '', phone: '', roles: ['player'] });
      
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Deleting user:', userId);
      
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        throw error;
      }

      await loadUsers();
      
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async (userEmail: string) => {
    try {
      console.log('Sending password reset to:', userEmail);
      
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        console.error('Error sending password reset:', error);
        throw error;
      }

      toast({
        title: 'Success',
        description: `Password reset email sent to ${userEmail}`,
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: 'Error',
        description: 'Failed to send password reset email',
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setNewUserData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      roles: user.roles || ['player']
    });
    setIsEditModalOpen(true);
  };

  const addRole = (role: string) => {
    if (!newUserData.roles.includes(role)) {
      setNewUserData(prev => ({
        ...prev,
        roles: [...prev.roles, role]
      }));
    }
  };

  const removeRole = (role: string) => {
    setNewUserData(prev => ({
      ...prev,
      roles: prev.roles.filter(r => r !== role)
    }));
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'global_admin': return 'bg-red-500';
      case 'club_admin': return 'bg-blue-500';
      case 'manager':
      case 'team_manager': return 'bg-green-500';
      case 'coach': return 'bg-purple-500';
      case 'player': return 'bg-gray-500';
      default: return 'bg-orange-500';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.roles?.includes(roleFilter);
    
    return matchesSearch && matchesRole;
  });

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
          <h3 className="text-lg font-semibold">User Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage all user accounts, roles, and permissions in the system.
          </p>
        </div>
        <Button onClick={loadUsers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleFilter">Filter by Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="roleFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="global_admin">Global Admin</SelectItem>
                  <SelectItem value="club_admin">Club Admin</SelectItem>
                   <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            All registered users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || 'No name'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((role) => (
                        <Badge key={role} className={`text-white ${getRoleBadgeColor(role)}`}>
                          {role.replace('_', ' ')}
                        </Badge>
                      ))}
                      {user.staffTeams?.map((staff, index) => (
                        <Badge key={`${staff.role}-${index}`} className="text-white bg-indigo-500" title={`${staff.role} at ${staff.teamName}`}>
                          {staff.role.replace('_', ' ')} ({staff.teamName})
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(user.email)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Users Found</h3>
              <p className="text-muted-foreground">
                No users match your current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and roles.
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
              <div className="flex flex-wrap gap-2 mb-2">
                {newUserData.roles.map((role) => (
                  <Badge key={role} className={`text-white ${getRoleBadgeColor(role)}`}>
                    {role.replace('_', ' ')}
                    <button
                      className="ml-2 text-white hover:text-gray-200"
                      onClick={() => removeRole(role)}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Select value="" onValueChange={addRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Add role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global_admin">Global Admin</SelectItem>
                  <SelectItem value="club_admin">Club Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdateUser}>Update User</Button>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
