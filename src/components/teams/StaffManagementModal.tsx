
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Team, TeamStaff } from '@/types/team';
import { UserPlus, Trash2, Users, Mail, Phone, Edit, Search, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { userInvitationService } from '@/services/userInvitationService';

interface StaffManagementModalProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (teamData: Partial<Team>) => void;
}

interface ExistingUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  roles?: string[];
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  team,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [staff, setStaff] = useState<TeamStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInvitingStaff, setIsInvitingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<TeamStaff | null>(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'coach' as TeamStaff['role']
  });
  const [inviteTab, setInviteTab] = useState<'new' | 'existing'>('new');
  const [userSearch, setUserSearch] = useState('');
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedExistingUser, setSelectedExistingUser] = useState<ExistingUser | null>(null);
  const [existingUserRole, setExistingUserRole] = useState<TeamStaff['role']>('coach');
  const { toast } = useToast();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && team?.id) {
      console.log('StaffManagementModal: Modal opened for team:', team.id);
      setStaff([]);
      setLoading(true);
      setIsInvitingStaff(false);
      setEditingStaff(null);
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      setInviteTab('new');
      setUserSearch('');
      setExistingUsers([]);
      setSelectedExistingUser(null);
      loadStaff();
    } else if (!isOpen) {
      // Clean up state when modal closes
      setStaff([]);
      setIsInvitingStaff(false);
      setEditingStaff(null);
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      setUserSearch('');
      setExistingUsers([]);
      setSelectedExistingUser(null);
    }
  }, [isOpen, team?.id]);

  // Search for existing users when typing
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearch.length < 2) {
        setExistingUsers([]);
        return;
      }

      setSearchingUsers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .or(`name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
          .limit(10);

        if (error) throw error;

        // Filter out users already on the team
        const existingStaffIds = staff.map(s => s.user_id);
        const filteredUsers = (data || []).filter(u => !existingStaffIds.includes(u.id));
        
        setExistingUsers(filteredUsers.map(u => ({
          id: u.id,
          full_name: u.name || 'Unknown',
          email: u.email || '',
          avatar_url: u.avatar_url
        })));
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setSearchingUsers(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [userSearch, staff]);

  const loadStaff = async () => {
    if (!team?.id) {
      console.error('StaffManagementModal: No team ID provided');
      setLoading(false);
      return;
    }

    try {
      console.log('StaffManagementModal: Loading staff for team:', team.id);
      
      const { data, error } = await supabase
        .from('team_staff')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('StaffManagementModal: Database error:', error);
        throw error;
      }

      console.log('StaffManagementModal: Raw staff data:', data);

      if (data) {
        const staffMembers: TeamStaff[] = data.map(record => {
          try {
            return {
              id: record.id,
              name: record.name || '',
              email: record.email || '',
              phone: record.phone || '',
              role: record.role as TeamStaff['role'],
              user_id: record.user_id || undefined,
              coachingBadges: [],
              certificates: [],
              createdAt: record.created_at,
              updatedAt: record.updated_at
            };
          } catch (parseError) {
            console.error('StaffManagementModal: Error parsing staff record:', parseError, record);
            return {
              id: record.id,
              name: record.name || 'Unknown',
              email: record.email || '',
              phone: record.phone || '',
              role: (record.role as TeamStaff['role']) || 'helper',
              user_id: record.user_id || undefined,
              coachingBadges: [],
              certificates: [],
              createdAt: record.created_at,
              updatedAt: record.updated_at
            };
          }
        });
        
        console.log('StaffManagementModal: Processed staff:', staffMembers);
        setStaff(staffMembers);
      } else {
        setStaff([]);
      }
    } catch (error: any) {
      console.error('StaffManagementModal: Error loading staff:', error);
      setStaff([]);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load team staff',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteStaff = async () => {
    if (!newStaff.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Staff name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!newStaff.email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Staff email is required',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStaff.email.trim())) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    if (!team?.id) {
      toast({
        title: 'Error',
        description: 'No team selected',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('StaffManagementModal: Inviting staff member:', newStaff);

      await userInvitationService.inviteUser({
        email: newStaff.email.trim(),
        name: newStaff.name.trim(),
        role: 'staff',
        teamId: team.id
      });

      console.log('StaffManagementModal: Staff invitation sent successfully');

      // Reset form
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      setIsInvitingStaff(false);
      
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${newStaff.name} at ${newStaff.email}`,
      });
    } catch (error: any) {
      console.error('StaffManagementModal: Error inviting staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    }
  };

  const handleLinkExistingUser = async () => {
    if (!selectedExistingUser || !team?.id) {
      toast({
        title: 'Error',
        description: 'Please select a user to link',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Add to team_staff table
      const { error } = await supabase
        .from('team_staff')
        .insert({
          team_id: team.id,
          user_id: selectedExistingUser.id,
          name: selectedExistingUser.full_name,
          email: selectedExistingUser.email,
          role: existingUserRole,
        });

      if (error) throw error;

      toast({
        title: 'Staff Linked',
        description: `${selectedExistingUser.full_name} has been added to the team as ${existingUserRole}`,
      });

      // Reset and reload
      setSelectedExistingUser(null);
      setUserSearch('');
      setExistingUsers([]);
      setIsInvitingStaff(false);
      await loadStaff();
    } catch (error: any) {
      console.error('Error linking user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to link user',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff || !newStaff.name.trim() || !newStaff.email.trim()) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('StaffManagementModal: Updating staff member:', editingStaff.id, newStaff);
      
      const { error } = await supabase
        .from('team_staff')
        .update({
          name: newStaff.name.trim(),
          email: newStaff.email.trim(),
          phone: newStaff.phone.trim() || null,
          role: newStaff.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingStaff.id);

      if (error) {
        console.error('StaffManagementModal: Update error:', error);
        throw error;
      }

      console.log('StaffManagementModal: Staff member updated successfully');

      // Reload staff list
      await loadStaff();
      
      // Reset form
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      setEditingStaff(null);
      
      toast({
        title: 'Success',
        description: `${newStaff.name} has been updated`,
      });
    } catch (error: any) {
      console.error('StaffManagementModal: Error updating staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update staff member',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveStaff = async (staffId: string, staffName: string) => {
    try {
      console.log('StaffManagementModal: Removing staff member:', staffId);

      const { error } = await supabase
        .from('team_staff')
        .delete()
        .eq('id', staffId);
      
      if (error) {
        console.error('StaffManagementModal: Delete error:', error);
        throw error;
      }
      
      console.log('StaffManagementModal: Staff member removed successfully');
      
      // Reload staff list
      await loadStaff();
      
      toast({
        title: 'Success',
        description: `${staffName} has been removed from the team`,
      });
    } catch (error: any) {
      console.error('StaffManagementModal: Error removing staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove staff member',
        variant: 'destructive',
      });
    }
  };

  const getRoleColor = (role: TeamStaff['role']) => {
    switch (role) {
      case 'manager': return 'bg-blue-500';
      case 'assistant_manager': return 'bg-purple-500';
      case 'coach': return 'bg-green-500';
      case 'helper': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: TeamStaff['role']) => {
    return role.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Don't render if no team
  if (!team) {
    return null;
  }

  // Split staff into linked and unlinked
  const linkedStaff = staff.filter(s => s.user_id);
  const unlinkedStaff = staff.filter(s => !s.user_id);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-[700px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg truncate pr-8">Staff - {team.name}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Invite staff members or link existing users to join your team.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h3 className="text-base font-semibold">Team Staff</h3>
            <Button 
              onClick={() => setIsInvitingStaff(true)}
              disabled={loading}
              size="sm"
              className="bg-puma-blue-500 hover:bg-puma-blue-600"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </div>

          {(isInvitingStaff || editingStaff) && (
            <Card>
              <CardHeader className="pb-3 px-3 sm:px-6">
                <CardTitle className="text-base">
                  {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
                </CardTitle>
                {!editingStaff && (
                  <CardDescription className="text-xs sm:text-sm">
                    Invite someone new or link an existing user
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4 px-3 sm:px-6">
                {!editingStaff && (
                  <Tabs value={inviteTab} onValueChange={(v) => setInviteTab(v as 'new' | 'existing')}>
                    <TabsList className="grid w-full grid-cols-2 h-auto">
                      <TabsTrigger value="new" className="text-xs sm:text-sm py-2">Invite New</TabsTrigger>
                      <TabsTrigger value="existing" className="text-xs sm:text-sm py-2">Link Existing</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="new" className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="staffName" className="text-sm">Name *</Label>
                          <Input
                            id="staffName"
                            value={newStaff.name}
                            onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter full name"
                            maxLength={100}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="staffEmail" className="text-sm">Email *</Label>
                          <Input
                            id="staffEmail"
                            type="email"
                            value={newStaff.email}
                            onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Enter email address"
                            maxLength={255}
                            className="h-10"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="staffPhone" className="text-sm">Phone</Label>
                            <Input
                              id="staffPhone"
                              value={newStaff.phone}
                              onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="Phone"
                              maxLength={20}
                              className="h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="staffRole" className="text-sm">Role</Label>
                            <Select 
                              value={newStaff.role}
                              onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value as TeamStaff['role'] }))}
                            >
                              <SelectTrigger id="staffRole" className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="assistant_manager">Assistant Manager</SelectItem>
                                <SelectItem value="coach">Coach</SelectItem>
                                <SelectItem value="helper">Helper</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={handleInviteStaff} size="sm" className="flex-1 sm:flex-none">
                          Send Invitation
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setIsInvitingStaff(false);
                            setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="existing" className="mt-4 space-y-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Search Users</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              placeholder="Search by name or email..."
                              className="pl-10 h-10"
                            />
                          </div>
                        </div>

                        {searchingUsers && (
                          <p className="text-sm text-muted-foreground">Searching...</p>
                        )}

                        {existingUsers.length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {existingUsers.map((user) => (
                              <div
                                key={user.id}
                                onClick={() => setSelectedExistingUser(user)}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                  selectedExistingUser?.id === user.id 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                    {user.full_name?.slice(0, 2).toUpperCase() || '??'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm truncate">{user.full_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedExistingUser && (
                          <div className="space-y-3 pt-2 border-t">
                            <div className="flex items-center gap-2 text-sm">
                              <Link2 className="h-4 w-4" />
                              <span>Link as:</span>
                              <Select 
                                value={existingUserRole}
                                onValueChange={(value) => setExistingUserRole(value as TeamStaff['role'])}
                              >
                                <SelectTrigger className="h-8 w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="assistant_manager">Asst Manager</SelectItem>
                                  <SelectItem value="coach">Coach</SelectItem>
                                  <SelectItem value="helper">Helper</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleLinkExistingUser} 
                            size="sm" 
                            className="flex-1 sm:flex-none"
                            disabled={!selectedExistingUser}
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            Link User
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setIsInvitingStaff(false);
                              setUserSearch('');
                              setExistingUsers([]);
                              setSelectedExistingUser(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}

                {editingStaff && (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="editStaffName" className="text-sm">Name *</Label>
                        <Input
                          id="editStaffName"
                          value={newStaff.name}
                          onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter full name"
                          maxLength={100}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editStaffEmail" className="text-sm">Email *</Label>
                        <Input
                          id="editStaffEmail"
                          type="email"
                          value={newStaff.email}
                          onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email address"
                          maxLength={255}
                          disabled={!!editingStaff}
                          className="h-10"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="editStaffPhone" className="text-sm">Phone</Label>
                          <Input
                            id="editStaffPhone"
                            value={newStaff.phone}
                            onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="Phone"
                            maxLength={20}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editStaffRole" className="text-sm">Role</Label>
                          <Select 
                            value={newStaff.role}
                            onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value as TeamStaff['role'] }))}
                          >
                            <SelectTrigger id="editStaffRole" className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="assistant_manager">Assistant Manager</SelectItem>
                              <SelectItem value="coach">Coach</SelectItem>
                              <SelectItem value="helper">Helper</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateStaff} size="sm" className="flex-1 sm:flex-none">
                        Update Staff Member
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setEditingStaff(null);
                          setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-sm">Loading staff...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Staff */}
              {linkedStaff.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-green-700">Active Staff ({linkedStaff.length})</h4>
                  {linkedStaff.map((staffMember) => (
                    <Card key={staffMember.id}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-sm truncate">{staffMember.name}</h4>
                                <Badge className={`text-white text-xs ${getRoleColor(staffMember.role)}`}>
                                  {getRoleLabel(staffMember.role)}
                                </Badge>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground mt-1">
                                <div className="flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{staffMember.email}</span>
                                </div>
                                {staffMember.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3 flex-shrink-0" />
                                    {staffMember.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditingStaff(staffMember);
                                setNewStaff({
                                  name: staffMember.name,
                                  email: staffMember.email,
                                  phone: staffMember.phone || '',
                                  role: staffMember.role
                                });
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => {
                                if (confirm(`Remove ${staffMember.name}?`)) {
                                  handleRemoveStaff(staffMember.id, staffMember.name);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pending Staff */}
              {unlinkedStaff.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-orange-700">Pending Invitations ({unlinkedStaff.length})</h4>
                  <p className="text-xs text-muted-foreground">
                    These staff members haven't created accounts yet.
                  </p>
                  {unlinkedStaff.map((staffMember) => (
                    <Card key={staffMember.id} className="border-orange-200">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-sm truncate">{staffMember.name}</h4>
                                <Badge className={`text-white text-xs ${getRoleColor(staffMember.role)}`}>
                                  {getRoleLabel(staffMember.role)}
                                </Badge>
                                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                                  Pending
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 truncate">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{staffMember.email}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditingStaff(staffMember);
                                setNewStaff({
                                  name: staffMember.name,
                                  email: staffMember.email,
                                  phone: staffMember.phone || '',
                                  role: staffMember.role
                                });
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => {
                                if (confirm(`Remove ${staffMember.name}?`)) {
                                  handleRemoveStaff(staffMember.id, staffMember.name);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {staff.length === 0 && (
                <Card className="border-dashed border-2">
                  <CardContent className="py-6 text-center">
                    <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold text-sm mb-2">No Staff Members</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Start by inviting your team's coaching staff and helpers.
                    </p>
                    <Button onClick={() => setIsInvitingStaff(true)} size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Staff Member
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
