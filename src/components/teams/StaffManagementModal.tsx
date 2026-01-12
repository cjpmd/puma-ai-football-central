import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Team, TeamStaff } from '@/types/team';
import { UserPlus, Trash2, Users, Mail, Phone, Edit, Check, ChevronsUpDown, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface StaffRequest {
  id: string;
  team_id: string;
  user_id: string;
  name: string;
  email: string;
  status: string;
  requested_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  currentRole: string;
}

interface StaffManagementModalProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  team,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [staff, setStaff] = useState<TeamStaff[]>([]);
  const [staffRequests, setStaffRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<TeamStaff | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [nameSearchOpen, setNameSearchOpen] = useState(false);
  const [nameSearchValue, setNameSearchValue] = useState('');
  const [approvalRoles, setApprovalRoles] = useState<Record<string, TeamStaff['role']>>({});
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'coach' as TeamStaff['role']
  });
  const { toast } = useToast();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && team?.id) {
      console.log('StaffManagementModal: Modal opened for team:', team.id);
      setStaff([]);
      setStaffRequests([]);
      setLoading(true);
      setIsAddingStaff(false);
      setEditingStaff(null);
      setSelectedUser(null);
      setNameSearchValue('');
      setApprovalRoles({});
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      loadStaff();
      loadTeamMembers();
      loadStaffRequests();
    } else if (!isOpen) {
      setStaff([]);
      setStaffRequests([]);
      setIsAddingStaff(false);
      setEditingStaff(null);
      setSelectedUser(null);
      setNameSearchValue('');
      setApprovalRoles({});
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
    }
  }, [isOpen, team?.id]);

  const loadStaffRequests = async () => {
    if (!team?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('staff_requests')
        .select('*')
        .eq('team_id', team.id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });
      
      if (error) throw error;
      
      setStaffRequests(data || []);
      
      // Initialize approval roles
      const roles: Record<string, TeamStaff['role']> = {};
      (data || []).forEach(req => {
        roles[req.id] = 'coach';
      });
      setApprovalRoles(prev => ({ ...prev, ...roles }));
    } catch (error) {
      console.error('Error loading staff requests:', error);
    }
  };

  const loadTeamMembers = async () => {
    if (!team?.id) return;
    
    try {
      // Get existing team members from user_teams (parents, players, etc.)
      const { data: members, error } = await supabase
        .from('user_teams')
        .select(`
          user_id,
          role,
          profiles:user_id(id, name, email)
        `)
        .eq('team_id', team.id);
      
      if (error) throw error;

      // Get existing staff user_ids to exclude
      const { data: existingStaff } = await supabase
        .from('team_staff')
        .select('user_id')
        .eq('team_id', team.id)
        .not('user_id', 'is', null);

      const existingStaffUserIds = new Set((existingStaff || []).map(s => s.user_id));

      // Transform and filter out those already staff
      const availableMembers: TeamMember[] = (members || [])
        .filter((m: any) => m.profiles && !existingStaffUserIds.has(m.user_id))
        .map((m: any) => ({
          id: m.user_id,
          name: m.profiles?.name || 'Unknown',
          email: m.profiles?.email || '',
          currentRole: formatRoleForDisplay(m.role)
        }));

      setTeamMembers(availableMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const formatRoleForDisplay = (role: string): string => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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
        const staffMembers: TeamStaff[] = data.map(record => ({
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
        }));
        
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

  const handleSelectTeamMember = (member: TeamMember) => {
    setSelectedUser(member);
    setNewStaff({
      ...newStaff,
      name: member.name,
      email: member.email,
      phone: member.phone || ''
    });
    setNameSearchOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setNewStaff({ name: '', email: '', phone: '', role: newStaff.role });
    setNameSearchValue('');
  };

  const handleAddStaff = async () => {
    if (!newStaff.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Staff name is required',
        variant: 'destructive',
      });
      return;
    }

    // Email is required for new staff (not existing users)
    if (!selectedUser && !newStaff.email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Email is required for new staff members',
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
      console.log('StaffManagementModal: Adding staff member:', newStaff, 'selectedUser:', selectedUser);

      let userId = selectedUser?.id || null;
      
      // If not selecting existing user, check if user with this email exists
      if (!selectedUser && newStaff.email.trim()) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', newStaff.email.trim().toLowerCase())
          .maybeSingle();
        
        if (existingUser) {
          userId = existingUser.id;
        }
      }

      // Create staff record
      const { error } = await supabase
        .from('team_staff')
        .insert({
          team_id: team.id,
          name: newStaff.name.trim(),
          email: newStaff.email.trim() || null,
          phone: newStaff.phone.trim() || null,
          role: newStaff.role,
          user_id: userId,
        });

      if (error) throw error;

      // If we have a user_id, also add/update user_teams entry
      if (userId) {
        const { error: userTeamsError } = await supabase
          .from('user_teams')
          .upsert({
            user_id: userId,
            team_id: team.id,
            role: newStaff.role
          }, { 
            onConflict: 'user_id,team_id',
            ignoreDuplicates: false 
          });
        
        if (userTeamsError) {
          console.error('Error upserting user_teams:', userTeamsError);
        }
      }

      console.log('StaffManagementModal: Staff member added successfully');

      // Reset form and reload
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      setSelectedUser(null);
      setNameSearchValue('');
      setIsAddingStaff(false);
      await loadStaff();
      await loadTeamMembers();
      
      const message = userId 
        ? `${newStaff.name} has been added and linked to the team`
        : `${newStaff.name} has been added. They will be linked when they sign up with ${newStaff.email}`;
      
      toast({
        title: 'Staff Added',
        description: message,
      });
    } catch (error: any) {
      console.error('StaffManagementModal: Error adding staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add staff member',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff || !newStaff.name.trim()) {
      toast({
        title: 'Error',
        description: 'Name is required',
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
          email: newStaff.email.trim() || null,
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

      await loadStaff();
      
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
      
      await loadStaff();
      await loadTeamMembers();
      
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

  const handleApproveRequest = async (request: StaffRequest) => {
    try {
      const role = approvalRoles[request.id] || 'coach';
      
      // Create team_staff entry
      await supabase.from('team_staff').insert({
        team_id: team.id,
        user_id: request.user_id,
        name: request.name,
        email: request.email,
        role: role
      });
      
      // Add to user_teams
      await supabase.from('user_teams').insert({
        user_id: request.user_id,
        team_id: team.id,
        role: role === 'manager' ? 'team_manager' : 
              role === 'assistant_manager' ? 'team_assistant_manager' : 
              'team_coach'
      });
      
      // Update request status
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('staff_requests')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', request.id);
      
      // Update the user's profile
      await supabase.from('profiles')
        .update({ roles: ['coach'] })
        .eq('id', request.user_id);
      
      toast({
        title: 'Request Approved',
        description: `${request.name} has been added as ${getRoleLabel(role)}`
      });
      
      await loadStaff();
      await loadStaffRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive'
      });
    }
  };

  const handleRejectRequest = async (request: StaffRequest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('staff_requests')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', request.id);
      
      toast({
        title: 'Request Rejected',
        description: `${request.name}'s request has been rejected`
      });
      
      await loadStaffRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive'
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Filter team members by search
  const filteredTeamMembers = useMemo(() => {
    if (!nameSearchValue) return teamMembers;
    const search = nameSearchValue.toLowerCase();
    return teamMembers.filter(m => 
      m.name.toLowerCase().includes(search) ||
      m.email.toLowerCase().includes(search)
    );
  }, [teamMembers, nameSearchValue]);

  if (!team) {
    return null;
  }

  const linkedStaff = staff.filter(s => s.user_id);
  const unlinkedStaff = staff.filter(s => !s.user_id);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-[700px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg truncate pr-8">Staff - {team.name}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Add and manage staff members for your team.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="staff" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="staff">Staff Members</TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Pending Requests
              {staffRequests.length > 0 && (
                <Badge className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5">{staffRequests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <h3 className="text-base font-semibold">Team Staff</h3>
              <Button 
                onClick={() => setIsAddingStaff(true)}
                disabled={loading}
                size="sm"
                className="bg-puma-blue-500 hover:bg-puma-blue-600"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </div>

          {(isAddingStaff || editingStaff) && (
            <Card>
              <CardHeader className="pb-3 px-3 sm:px-6">
                <CardTitle className="text-base">
                  {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
                </CardTitle>
                {!editingStaff && (
                  <CardDescription className="text-xs sm:text-sm">
                    Search for an existing team member or enter details for a new staff member.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4 px-3 sm:px-6">
                <div className="grid grid-cols-1 gap-4">
                  {/* Name field - with search for existing members (only when adding, not editing) */}
                  <div className="space-y-2">
                    <Label htmlFor="staffName" className="text-sm">Name *</Label>
                    {editingStaff ? (
                      <Input
                        id="staffName"
                        value={newStaff.name}
                        onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter full name"
                        maxLength={100}
                        className="h-10"
                      />
                    ) : (
                      <Popover open={nameSearchOpen} onOpenChange={setNameSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={nameSearchOpen}
                            className="w-full justify-between h-10 font-normal"
                          >
                            {selectedUser ? (
                              <span className="flex items-center gap-2">
                                {selectedUser.name}
                                <Badge variant="secondary" className="text-xs">
                                  {selectedUser.currentRole}
                                </Badge>
                              </span>
                            ) : newStaff.name ? (
                              <span>{newStaff.name} (New)</span>
                            ) : (
                              <span className="text-muted-foreground">Search existing members or type name...</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput 
                              placeholder="Search team members..." 
                              value={nameSearchValue}
                              onValueChange={setNameSearchValue}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {nameSearchValue && (
                                  <div className="py-2">
                                    <Button
                                      variant="ghost"
                                      className="w-full justify-start"
                                      onClick={() => {
                                        setNewStaff(prev => ({ ...prev, name: nameSearchValue }));
                                        setSelectedUser(null);
                                        setNameSearchOpen(false);
                                      }}
                                    >
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      Add "{nameSearchValue}" as new staff
                                    </Button>
                                  </div>
                                )}
                              </CommandEmpty>
                              {filteredTeamMembers.length > 0 && (
                                <CommandGroup heading="Existing Team Members">
                                  {filteredTeamMembers.map((member) => (
                                    <CommandItem
                                      key={member.id}
                                      onSelect={() => handleSelectTeamMember(member)}
                                      className="cursor-pointer"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedUser?.id === member.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{member.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {member.currentRole} • {member.email}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                              {nameSearchValue && (
                                <CommandGroup heading="Or add new">
                                  <CommandItem
                                    onSelect={() => {
                                      setNewStaff(prev => ({ ...prev, name: nameSearchValue }));
                                      setSelectedUser(null);
                                      setNameSearchOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Add "{nameSearchValue}" as new staff member
                                  </CommandItem>
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                    {selectedUser && !editingStaff && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={handleClearSelection}
                      >
                        Clear selection
                      </Button>
                    )}
                  </div>
                  
                  {/* Email field */}
                  <div className="space-y-2">
                    <Label htmlFor="staffEmail" className="text-sm">
                      Email {!selectedUser && !editingStaff && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="staffEmail"
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                      maxLength={255}
                      className="h-10"
                      disabled={!!selectedUser || !!editingStaff?.user_id}
                    />
                    {!selectedUser && !editingStaff && (
                      <p className="text-xs text-muted-foreground">
                        Used to automatically link when they create an account
                      </p>
                    )}
                  </div>
                  
                  {/* Phone and Role */}
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
                  <Button 
                    onClick={editingStaff ? handleUpdateStaff : handleAddStaff} 
                    size="sm" 
                    className="flex-1 sm:flex-none"
                  >
                    {editingStaff ? 'Update Staff Member' : 'Add Staff Member'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsAddingStaff(false);
                      setEditingStaff(null);
                      setSelectedUser(null);
                      setNameSearchValue('');
                      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
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
              {/* Active Staff (Linked) */}
              {linkedStaff.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-green-700">Linked Staff ({linkedStaff.length})</h4>
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
                                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                  Linked
                                </Badge>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground mt-1">
                                {staffMember.email && (
                                  <div className="flex items-center gap-1 truncate">
                                    <Mail className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{staffMember.email}</span>
                                  </div>
                                )}
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

              {/* Unlinked Staff */}
              {unlinkedStaff.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-orange-700">Not Yet Linked ({unlinkedStaff.length})</h4>
                  <p className="text-xs text-muted-foreground">
                    These staff members will be automatically linked when they sign up with their email address.
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
                                  Not Linked
                                </Badge>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground mt-1">
                                {staffMember.email && (
                                  <div className="flex items-center gap-1 truncate">
                                    <Mail className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{staffMember.email}</span>
                                  </div>
                                )}
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

              {/* Empty State */}
              {staff.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No staff members yet</p>
                  <p className="text-xs mt-1">Add staff members to help manage your team</p>
                </div>
              )}
            </div>
          )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {staffRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No pending requests</p>
                <p className="text-xs mt-1">Staff members who sign up via the team code will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffRequests.map((request) => (
                  <Card key={request.id} className="border-orange-200">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Clock className="h-5 w-5 text-orange-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-sm">{request.name}</h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{request.email}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Requested {formatTimeAgo(request.requested_at)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Select 
                            value={approvalRoles[request.id] || 'coach'}
                            onValueChange={(value) => setApprovalRoles(prev => ({ ...prev, [request.id]: value as TeamStaff['role'] }))}
                          >
                            <SelectTrigger className="h-9 flex-1">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="assistant_manager">Assistant Manager</SelectItem>
                              <SelectItem value="coach">Coach</SelectItem>
                              <SelectItem value="helper">Helper</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveRequest(request)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1 sm:flex-none text-red-600 hover:text-red-700"
                              onClick={() => handleRejectRequest(request)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
