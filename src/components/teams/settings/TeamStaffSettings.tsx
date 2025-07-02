
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Team, TeamStaff } from '@/types/team';
import { Plus, Edit, Trash2, Users, Mail, Phone, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { userInvitationService } from '@/services/userInvitationService';

interface TeamStaffSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamStaffSettings: React.FC<TeamStaffSettingsProps> = ({
  team,
  onUpdate
}) => {
  const [staff, setStaff] = useState<TeamStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInvitingStaff, setIsInvitingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<TeamStaff | null>(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'coach' as TeamStaff['role']
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    console.log('TeamStaffSettings: Loading staff for team:', team?.id);
    if (team?.id) {
      loadStaffFromDatabase();
    }
  }, [team?.id]);

  const loadStaffFromDatabase = async () => {
    try {
      console.log('TeamStaffSettings: Starting to load staff for team:', team.id);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('team_staff')
        .select('*')
        .eq('team_id', team.id);

      if (error) {
        console.error('TeamStaffSettings: Error loading staff:', error);
        throw error;
      }

      console.log('TeamStaffSettings: Loaded staff data:', data);

      if (data && Array.isArray(data)) {
        const staffMembers: TeamStaff[] = data.map(record => {
          console.log('TeamStaffSettings: Processing staff record:', record);
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
        });
        
        console.log('TeamStaffSettings: Processed staff members:', staffMembers);
        setStaff(staffMembers);
        
        if (staffMembers.length > 0) {
          onUpdate({ staff: staffMembers });
        }
      } else {
        setStaff([]);
      }
    } catch (error) {
      console.error('TeamStaffSettings: Error in loadStaffFromDatabase:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team staff. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteStaff = async () => {
    if (!newStaff.name || !newStaff.email) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('TeamStaffSettings: Inviting new staff member:', newStaff);
      
      await userInvitationService.inviteUser({
        email: newStaff.email,
        name: newStaff.name,
        role: 'staff',
        teamId: team.id
      });
      
      console.log('TeamStaffSettings: Staff invitation sent successfully');
      
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      setIsInvitingStaff(false);
      
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${newStaff.name} at ${newStaff.email}`,
      });
    } catch (error: any) {
      console.error('TeamStaffSettings: Error in handleInviteStaff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff || !newStaff.name || !newStaff.email) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('TeamStaffSettings: Updating staff member:', editingStaff.id, newStaff);
      
      const { error } = await supabase
        .from('team_staff')
        .update({
          name: newStaff.name,
          email: newStaff.email,
          phone: newStaff.phone || null,
          role: newStaff.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingStaff.id);

      if (error) {
        console.error('TeamStaffSettings: Error updating staff:', error);
        throw error;
      }
      
      console.log('TeamStaffSettings: Staff member updated successfully');
      await loadStaffFromDatabase();
      
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      setEditingStaff(null);
      
      toast({
        title: 'Success',
        description: `${newStaff.name} has been updated`,
      });
    } catch (error: any) {
      console.error('TeamStaffSettings: Error in handleUpdateStaff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update staff member',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      console.log('TeamStaffSettings: Removing staff member:', staffId);
      
      const staffMember = staff.find(s => s.id === staffId);
      
      const { error } = await supabase
        .from('team_staff')
        .delete()
        .eq('id', staffId);
      
      if (error) {
        console.error('TeamStaffSettings: Error removing staff member:', error);
        throw error;
      }
      
      console.log('TeamStaffSettings: Staff member removed successfully');
      await loadStaffFromDatabase();
      
      toast({
        title: 'Success',
        description: `${staffMember?.name} has been removed from ${team.name}`,
      });
    } catch (error: any) {
      console.error('TeamStaffSettings: Error in handleRemoveStaff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove staff member',
        variant: 'destructive',
      });
    }
  };

  function getRoleColor(role: TeamStaff['role']) {
    switch (role) {
      case 'manager': return 'bg-blue-500';
      case 'assistant_manager': return 'bg-purple-500';
      case 'coach': return 'bg-green-500';
      case 'helper': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  }

  function getRoleLabel(role: TeamStaff['role']) {
    return role.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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

  // Split staff into linked and unlinked
  const linkedStaff = staff.filter(s => s.user_id);
  const unlinkedStaff = staff.filter(s => !s.user_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Staff Management</h3>
          <p className="text-sm text-muted-foreground">
            Invite staff members to join your team. They'll receive an email invitation to create an account.
          </p>
        </div>
        <Button 
          onClick={() => setIsInvitingStaff(true)}
          className="bg-puma-blue-500 hover:bg-puma-blue-600"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Staff
        </Button>
      </div>

      {/* Invite Staff Form */}
      {isInvitingStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Invite New Staff Member</CardTitle>
            <CardDescription>
              Send an invitation email to a new staff member
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staffName">Name</Label>
                <Input
                  id="staffName"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffRole">Role</Label>
                <Select 
                  value={newStaff.role}
                  onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value as TeamStaff['role'] }))}
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="staffEmail">Email</Label>
              <Input
                id="staffEmail"
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleInviteStaff}>
                Send Invitation
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsInvitingStaff(false);
                  setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Staff Form */}
      {editingStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Staff Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staffName">Name</Label>
                <Input
                  id="staffName"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffRole">Role</Label>
                <Select 
                  value={newStaff.role}
                  onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value as TeamStaff['role'] }))}
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
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staffEmail">Email</Label>
                <Input
                  id="staffEmail"
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffPhone">Phone</Label>
                <Input
                  id="staffPhone"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleUpdateStaff}>
                Update Staff Member
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingStaff(null);
                  setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Staff Section */}
      {linkedStaff.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-green-700">Active Staff Members ({linkedStaff.length})</h4>
          {linkedStaff.map((staffMember) => (
            <Card key={staffMember.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{staffMember.name}</h4>
                        <Badge className={`text-white ${getRoleColor(staffMember.role)}`}>
                          {getRoleLabel(staffMember.role)}
                        </Badge>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {staffMember.email}
                        </div>
                        {staffMember.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {staffMember.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
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
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove ${staffMember.name}?`)) {
                          handleRemoveStaff(staffMember.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Unlinked Staff Section */}
      {unlinkedStaff.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-orange-700">Pending Staff Invitations ({unlinkedStaff.length})</h4>
          <p className="text-sm text-muted-foreground">
            These staff members haven't created accounts yet. You can use Manual User Linking if they already have accounts.
          </p>
          {unlinkedStaff.map((staffMember) => (
            <Card key={staffMember.id} className="border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{staffMember.name}</h4>
                        <Badge className={`text-white ${getRoleColor(staffMember.role)}`}>
                          {getRoleLabel(staffMember.role)}
                        </Badge>
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Pending
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {staffMember.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
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
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove ${staffMember.name}?`)) {
                          handleRemoveStaff(staffMember.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
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
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Staff Members</h3>
            <p className="text-muted-foreground mb-4">
              Start by inviting your team's coaching staff and helpers.
            </p>
            <Button onClick={() => setIsInvitingStaff(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite First Staff Member
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
