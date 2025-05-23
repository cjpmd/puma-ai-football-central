
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Team, TeamStaff } from '@/types/team';
import { Plus, Trash2, Users, Mail, Phone } from 'lucide-react';
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
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      loadStaff();
    } else if (!isOpen) {
      // Clean up state when modal closes
      setStaff([]);
      setIsAddingStaff(false);
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
            // Safely handle coaching badges
            let coachingBadges: string[] = [];
            if (record.coaching_badges) {
              if (Array.isArray(record.coaching_badges)) {
                coachingBadges = record.coaching_badges
                  .filter(badge => typeof badge === 'string' && badge.trim().length > 0)
                  .map(badge => String(badge));
              }
            }

            // Safely handle certificates
            let certificates: any[] = [];
            if (record.certificates) {
              if (Array.isArray(record.certificates)) {
                certificates = record.certificates
                  .filter(cert => cert && typeof cert === 'object')
                  .map(cert => {
                    const certObj = cert as Record<string, any>;
                    return {
                      name: String(certObj.name || ''),
                      issuedBy: String(certObj.issuedBy || ''),
                      dateIssued: String(certObj.dateIssued || ''),
                      expiryDate: certObj.expiryDate ? String(certObj.expiryDate) : undefined
                    };
                  });
              }
            }

            return {
              id: record.id,
              name: record.name || '',
              email: record.email || '',
              phone: record.phone || '',
              role: record.role as TeamStaff['role'],
              user_id: record.user_id || undefined,
              coachingBadges,
              certificates,
              createdAt: record.created_at,
              updatedAt: record.updated_at
            };
          } catch (parseError) {
            console.error('StaffManagementModal: Error parsing staff record:', parseError, record);
            // Return a minimal valid staff member
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
    // Validate input
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

    // Basic email validation
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
      console.log('StaffManagementModal: Adding staff member:', newStaff);

      const insertData = {
        team_id: team.id,
        name: newStaff.name.trim(),
        email: newStaff.email.trim(),
        phone: newStaff.phone.trim() || null,
        role: newStaff.role,
        coaching_badges: [],
        certificates: []
      };

      console.log('StaffManagementModal: Insert data:', insertData);

      const { data, error } = await supabase
        .from('team_staff')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('StaffManagementModal: Insert error:', error);
        
        // Handle specific error cases
        if (error.code === '23505') {
          toast({
            title: 'Error',
            description: 'A staff member with this email already exists for this team',
            variant: 'destructive',
          });
          return;
        }
        
        throw error;
      }

      console.log('StaffManagementModal: Staff member added successfully:', data);

      // Reload staff list
      await loadStaff();
      
      // Reset form
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      setIsAddingStaff(false);
      
      toast({
        title: 'Success',
        description: `${newStaff.name} has been added to ${team.name}`,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Staff Management - {team.name}</DialogTitle>
          <DialogDescription>
            Manage your team's coaching staff and helpers.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Team Staff</h3>
            <Button 
              onClick={() => setIsAddingStaff(true)}
              disabled={loading}
              className="bg-puma-blue-500 hover:bg-puma-blue-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </div>

          {isAddingStaff && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Staff Member</CardTitle>
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
                
                <div className="flex gap-2">
                  <Button onClick={handleAddStaff}>Add Staff Member</Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingStaff(false);
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
          ) : staff.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Staff Added</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding your team's coaching staff and helpers.
                </p>
                <Button onClick={() => setIsAddingStaff(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Staff Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {staff.map((staffMember) => (
                <Card key={staffMember.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{staffMember.name}</h4>
                            <Badge className={`text-white ${getRoleColor(staffMember.role)}`}>
                              {getRoleLabel(staffMember.role)}
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
