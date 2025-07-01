
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Team, Staff } from '@/types';
import { UserPlus, Trash2, Users, Mail, Phone, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { userInvitationService } from '@/services/userInvitationService';

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
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInvitingStaff, setIsInvitingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'coach' as Staff['role']
  });
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
      loadStaff();
    } else if (!isOpen) {
      // Clean up state when modal closes
      setStaff([]);
      setIsInvitingStaff(false);
      setEditingStaff(null);
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
    }
  }, [isOpen, team?.id]);

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
        const staffMembers: Staff[] = data.map(record => {
          try {
            return {
              id: record.id,
              name: record.name || '',
              email: record.email || '',
              phone: record.phone || '',
              team_id: team.id,
              role: record.role as Staff['role'],
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
              role: (record.role as Staff['role']) || 'helper',
              team_id: team.id,
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

  const getRoleColor = (role: Staff['role']) => {
    switch (role) {
      case 'manager': return 'bg-blue-500';
      case 'assistant_manager': return 'bg-purple-500';
      case 'coach': return 'bg-green-500';
      case 'helper': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: Staff['role']) => {
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
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Staff Management - {team.name}</DialogTitle>
          <DialogDescription>
            Invite staff members to join your team. They'll receive an email invitation to create an account.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Team Staff</h3>
            <Button 
              onClick={() => setIsInvitingStaff(true)}
              disabled={loading}
              className="bg-puma-blue-500 hover:bg-puma-blue-600"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Staff
            </Button>
          </div>

          {(isInvitingStaff || editingStaff) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingStaff ? 'Edit Staff Member' : 'Invite New Staff Member'}
                </CardTitle>
                {!editingStaff && (
                  <CardDescription>
                    Send an invitation email to a new staff member
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="staffName">Name *</Label>
                    <Input
                      id="staffName"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staffEmail">Email *</Label>
                    <Input
                      id="staffEmail"
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                      maxLength={255}
                      disabled={!!editingStaff}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="staffPhone">Phone</Label>
                    <Input
                      id="staffPhone"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staffRole">Role</Label>
                    <Select 
                      value={newStaff.role}
                      onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value as Staff['role'] }))}
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
                
                <div className="flex gap-2">
                  <Button onClick={editingStaff ? handleUpdateStaff : handleInviteStaff}>
                    {editingStaff ? 'Update Staff Member' : 'Send Invitation'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsInvitingStaff(false);
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

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p>Loading staff...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Staff */}
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
                                  handleRemoveStaff(staffMember.id, staffMember.name);
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

              {/* Pending Staff */}
              {unlinkedStaff.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-orange-700">Pending Staff Invitations ({unlinkedStaff.length})</h4>
                  <p className="text-sm text-muted-foreground">
                    These staff members haven't created accounts yet.
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
                                  handleRemoveStaff(staffMember.id, staffMember.name);
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
