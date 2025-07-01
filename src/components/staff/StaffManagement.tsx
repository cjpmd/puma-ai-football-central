import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Phone, Mail, Calendar, Link2, UserPlus, RefreshCw, Trash2, Edit, AlertCircle } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  team_name?: string;
  team_id?: string;
  email?: string;
  phone?: string;
  linked_user_id?: string;
  linked_user_name?: string;
  coaching_badges?: any[];
  source: 'team_staff' | 'user_profile';
  user_roles?: string[];
}

export const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'coach',
    team_id: ''
  });
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const { user, profile } = useAuth();
  const { canViewStaff, isStaffMember } = useAuthorization();
  const { toast } = useToast();

  useEffect(() => {
    if (canViewStaff || isStaffMember) {
      loadStaff();
      loadAvailableTeams();
    }
  }, [canViewStaff, isStaffMember]);

  useEffect(() => {
    filterStaff();
  }, [staff, searchTerm]);

  const loadAvailableTeams = async () => {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setAvailableTeams(teams || []);
    } catch (error: any) {
      console.error('Error loading teams:', error);
    }
  };

  const loadStaff = async () => {
    try {
      setLoading(true);
      console.log('Loading all staff members...');

      // Get team staff from team_staff table
      const { data: staffData, error: staffError } = await supabase
        .from('team_staff')
        .select(`
          id,
          name,
          role,
          team_id,
          email,
          phone,
          teams!inner(name)
        `)
        .order('name');

      if (staffError) {
        console.error('Error fetching team staff:', staffError);
      }

      // Get user-staff links
      const { data: userStaffLinks, error: linksError } = await supabase
        .from('user_staff')
        .select(`
          staff_id,
          user_id,
          profiles!inner(name, email, phone)
        `);

      if (linksError) {
        console.error('Error fetching user-staff links:', linksError);
      }

      // Get users with staff roles
      const { data: staffUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, roles')
        .or('roles.cs.{team_manager,team_assistant_manager,team_coach,team_helper}');

      if (usersError) {
        console.error('Error fetching staff users:', usersError);
      }

      const allStaff: StaffMember[] = [];

      // Process team_staff records
      if (staffData) {
        const teamStaffMembers: StaffMember[] = staffData.map(staffMember => {
          const userLink = userStaffLinks?.find(link => link.staff_id === staffMember.id);
          
          return {
            id: staffMember.id,
            name: staffMember.name || 'Unknown',
            role: staffMember.role || 'Unknown Role',
            team_name: (staffMember as any).teams?.name || 'Unknown Team',
            team_id: staffMember.team_id,
            email: staffMember.email || (userLink as any)?.profiles?.email,
            phone: staffMember.phone || (userLink as any)?.profiles?.phone,
            linked_user_id: userLink?.user_id,
            linked_user_name: (userLink as any)?.profiles?.name,
            source: 'team_staff' as const
          };
        });
        allStaff.push(...teamStaffMembers);
      }

      // Process users with staff roles (who aren't already in team_staff)
      if (staffUsers) {
        const existingUserIds = userStaffLinks?.map(link => link.user_id) || [];
        
        const userStaffMembers: StaffMember[] = staffUsers
          .filter(user => !existingUserIds.includes(user.id))
          .map(user => ({
            id: user.id,
            name: user.name || 'Unknown',
            role: user.roles?.find((role: string) => 
              ['team_manager', 'team_assistant_manager', 'team_coach', 'team_helper'].includes(role)
            )?.replace('team_', '') || 'staff',
            email: user.email,
            phone: user.phone,
            linked_user_id: user.id,
            linked_user_name: user.name,
            source: 'user_profile' as const,
            user_roles: user.roles
          }));
        
        allStaff.push(...userStaffMembers);
      }

      console.log('All staff members loaded:', allStaff);
      setStaff(allStaff);
    } catch (error: any) {
      console.error('Error loading staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load staff',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffData.name || !newStaffData.email) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Add to team_staff table if team is selected
      if (newStaffData.team_id) {
        const { data, error } = await supabase
          .from('team_staff')
          .insert({
            name: newStaffData.name,
            email: newStaffData.email,
            phone: newStaffData.phone,
            role: newStaffData.role,
            team_id: newStaffData.team_id
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Success',
          description: `${newStaffData.name} has been added as ${newStaffData.role}`,
        });
      } else {
        // Check if user exists and add staff role
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', newStaffData.email)
          .single();

        if (existingUser) {
          // Add staff role to existing user
          const currentRoles = existingUser.roles || [];
          const staffRole = `team_${newStaffData.role}`;
          
          if (!currentRoles.includes(staffRole)) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                roles: [...currentRoles, staffRole]
              })
              .eq('id', existingUser.id);

            if (updateError) throw updateError;
          }

          toast({
            title: 'Success',
            description: `Staff role added to ${newStaffData.name}`,
          });
        } else {
          toast({
            title: 'User Not Found',
            description: 'Please select a team or ensure the user has an account',
            variant: 'destructive',
          });
          return;
        }
      }

      setShowAddModal(false);
      setNewStaffData({ name: '', email: '', phone: '', role: 'coach', team_id: '' });
      await loadStaff();
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add staff member',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveStaff = async (staffMember: StaffMember) => {
    if (!confirm(`Are you sure you want to remove ${staffMember.name}?`)) return;

    try {
      if (staffMember.source === 'team_staff') {
        // Remove from team_staff table
        const { error } = await supabase
          .from('team_staff')
          .delete()
          .eq('id', staffMember.id);

        if (error) throw error;
      } else {
        // Remove staff roles from user
        const { data: user, error: fetchError } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', staffMember.id)
          .single();

        if (fetchError) throw fetchError;

        const currentRoles = user.roles || [];
        const staffRoles = ['team_manager', 'team_assistant_manager', 'team_coach', 'team_helper'];
        const newRoles = currentRoles.filter((role: string) => !staffRoles.includes(role));

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ roles: newRoles })
          .eq('id', staffMember.id);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Success',
        description: `${staffMember.name} has been removed from staff`,
      });

      await loadStaff();
    } catch (error: any) {
      console.error('Error removing staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove staff member',
        variant: 'destructive',
      });
    }
  };

  const filterStaff = () => {
    let filtered = staff;

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.team_name && member.team_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredStaff(filtered);
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'manager': return 'bg-green-500';
      case 'assistant_manager': return 'bg-green-400';
      case 'coach': return 'bg-purple-500';
      case 'goalkeeper_coach': return 'bg-purple-400';
      case 'fitness_coach': return 'bg-orange-500';
      case 'physio': return 'bg-blue-500';
      case 'kit_manager': return 'bg-gray-500';
      default: return 'bg-gray-600';
    }
  };

  if (!canViewStaff && !isStaffMember) {
    return (
      <Card className="p-8 text-center">
        <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">
          You don't have permission to view staff information.
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Staff Directory</h2>
          <p className="text-muted-foreground">
            Manage all staff members across teams ({staff.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadStaff} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-puma-blue-500 hover:bg-puma-blue-600">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search staff by name, role, team, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Debug Info */}
      <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
        Debug: Found {staff.length} staff members, showing {filteredStaff.length} after filtering
      </div>

      {/* Staff List */}
      <div className="grid gap-4">
        {filteredStaff.map((member) => (
          <Card key={`${member.source}-${member.id}`} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-puma-blue-100 text-puma-blue-800">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {member.name}
                    </h3>
                    <Badge className={`${getRoleColor(member.role)} text-white text-xs`}>
                      {member.role}
                    </Badge>
                    {member.linked_user_id && (
                      <Badge variant="outline" className="text-xs">
                        <Link2 className="h-3 w-3 mr-1" />
                        Linked User
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {member.source === 'team_staff' ? 'Team Staff' : 'User Profile'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    {member.team_name && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{member.team_name}</span>
                      </div>
                    )}
                    
                    {member.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{member.email}</span>
                      </div>
                    )}
                    
                    {member.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    
                    {member.user_roles && member.user_roles.length > 0 && (
                      <div className="text-xs text-blue-600">
                        User Roles: {member.user_roles.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRemoveStaff(member)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}

        {/* No staff found */}
        {filteredStaff.length === 0 && (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No staff found</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Try adjusting your search criteria.'
                : 'No staff members have been added yet, or they need to be assigned staff roles.'
              }
            </p>
          </Card>
        )}
      </div>

      {/* Add Staff Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staffName">Name</Label>
              <Input
                id="staffName"
                value={newStaffData.name}
                onChange={(e) => setNewStaffData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="staffEmail">Email</Label>
              <Input
                id="staffEmail"
                type="email"
                value={newStaffData.email}
                onChange={(e) => setNewStaffData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="staffPhone">Phone</Label>
              <Input
                id="staffPhone"
                value={newStaffData.phone}
                onChange={(e) => setNewStaffData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="staffRole">Role</Label>
              <Select 
                value={newStaffData.role}
                onValueChange={(value) => setNewStaffData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger id="staffRole">
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
            
            <div className="space-y-2">
              <Label htmlFor="staffTeam">Team (Optional)</Label>
              <Select 
                value={newStaffData.team_id}
                onValueChange={(value) => setNewStaffData(prev => ({ ...prev, team_id: value || '' }))}
              >
                <SelectTrigger id="staffTeam">
                  <SelectValue placeholder="Select a team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific team</SelectItem>
                  {availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddStaff}>Add Staff Member</Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
