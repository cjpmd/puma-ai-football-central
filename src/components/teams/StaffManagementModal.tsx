
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Team, TeamStaff } from '@/types/team';
import { UserPlus, Trash2, Users, Mail, Phone, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [loading, setLoading] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<TeamStaff | null>(null);
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
      setLoading(true);
      setIsAddingStaff(false);
      setEditingStaff(null);
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      loadStaff();
    } else if (!isOpen) {
      // Clean up state when modal closes
      setStaff([]);
      setIsAddingStaff(false);
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

  const handleAddStaff = async () => {
    if (!newStaff.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Staff name is required',
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
      console.log('StaffManagementModal: Adding staff member:', newStaff);

      // Create staff record directly (no invitation needed)
      const { error } = await supabase
        .from('team_staff')
        .insert({
          team_id: team.id,
          name: newStaff.name.trim(),
          email: newStaff.email.trim() || null,
          phone: newStaff.phone.trim() || null,
          role: newStaff.role,
        });

      if (error) throw error;

      console.log('StaffManagementModal: Staff member added successfully');

      // Reset form and reload
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      setIsAddingStaff(false);
      await loadStaff();
      
      toast({
        title: 'Staff Added',
        description: `${newStaff.name} has been added to the team`,
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
            Add and manage staff members for your team.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
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
                    Add a new staff member to the team. They can link their account later.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4 px-3 sm:px-6">
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
                    <Label htmlFor="staffEmail" className="text-sm">Email (optional)</Label>
                    <Input
                      id="staffEmail"
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                      maxLength={255}
                      className="h-10"
                      disabled={!!editingStaff?.user_id}
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
                    These staff members haven't linked their accounts yet. They can join using a team code.
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
