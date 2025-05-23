
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, UserRole } from '@/types';
import { Trash2, PencilIcon, AlertCircle, MailIcon } from 'lucide-react';

type UserWithProfile = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  roles: UserRole[];
  createdAt: string;
}

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    roles: [] as UserRole[]
  });
  
  const availableRoles: UserRole[] = [
    'admin', 
    'global_admin', 
    'team_manager', 
    'team_assistant_manager', 
    'team_coach', 
    'team_helper',
    'parent',
    'player',
    'club_admin',
    'club_chair',
    'club_secretary'
  ];

  useEffect(() => {
    fetchUsers();
  }, []);
  
  useEffect(() => {
    if (selectedUser) {
      setEditForm({
        name: selectedUser.name || '',
        email: selectedUser.email || '',
        phone: selectedUser.phone || '',
        roles: selectedUser.roles || []
      });
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedUsers: UserWithProfile[] = profiles.map(profile => ({
        id: profile.id,
        email: profile.email || '',
        name: profile.name || '',
        phone: profile.phone || null,
        roles: (profile.roles || []) as UserRole[],
        createdAt: profile.created_at
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserWithProfile) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: UserWithProfile) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleResetPassword = (user: UserWithProfile) => {
    setSelectedUser(user);
    setIsResetPasswordDialogOpen(true);
  };

  const handleRoleToggle = (role: UserRole) => {
    setEditForm(prev => {
      if (prev.roles.includes(role)) {
        return {
          ...prev,
          roles: prev.roles.filter(r => r !== role)
        };
      } else {
        return {
          ...prev,
          roles: [...prev.roles, role]
        };
      }
    });
  };

  const saveUserChanges = async () => {
    if (!selectedUser) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          phone: editForm.phone,
          roles: editForm.roles,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      // This is simplified - in a real app, you'd use an admin function to delete the auth user
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const confirmResetPassword = async () => {
    if (!selectedUser?.email) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        selectedUser.email,
        { redirectTo: window.location.origin + '/reset-password' }
      );
      
      if (error) throw error;
      
      toast.success('Password reset email sent');
      setIsResetPasswordDialogOpen(false);
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error('Failed to send password reset email');
    }
  };

  const formatRoleBadge = (role: UserRole) => {
    let color = 'bg-gray-500';
    
    if (role.includes('admin')) color = 'bg-red-500';
    else if (role.includes('manager')) color = 'bg-blue-500';
    else if (role.includes('coach')) color = 'bg-green-500';
    else if (role === 'parent') color = 'bg-purple-500';
    else if (role === 'player') color = 'bg-yellow-500';
    
    return (
      <Badge key={role} className={`${color} text-white mr-1 mb-1`}>
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  const isCurrentUser = (userId: string) => {
    return currentUser?.id === userId;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              View and manage all users in the system
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              List of all registered users and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name || 'No Name'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap">
                            {user.roles && user.roles.map(role => formatRoleBadge(role))}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetPassword(user)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <MailIcon className="h-4 w-4" />
                            </Button>
                            {!isCurrentUser(user.id) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user details and role assignments
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>User Roles</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableRoles.map(role => (
                    <div key={role} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`role-${role}`}
                        checked={editForm.roles.includes(role)}
                        onChange={() => handleRoleToggle(role)}
                        className="h-4 w-4 rounded"
                      />
                      <label htmlFor={`role-${role}`} className="text-sm">
                        {role.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveUserChanges}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex items-center space-x-2 bg-amber-50 p-3 rounded border border-amber-200 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              <span>
                Deleting <strong>{selectedUser?.name || selectedUser?.email}</strong> will remove all their data.
              </span>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteUser}>
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Send a password reset email to {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            
            <p>
              The user will receive an email with instructions to reset their password.
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmResetPassword}>
                Send Reset Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
