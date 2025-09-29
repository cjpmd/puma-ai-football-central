
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, UserPlus, Award, CheckCircle, Clock, Info, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Team } from '@/types';

interface TeamStaff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  pvgChecked: boolean;
  pvgCheckedBy?: string;
  pvgCheckedAt?: string;
  coachingBadges: string[];
  certificates: any[];
}

interface TeamStaffModalProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamStaffModal: React.FC<TeamStaffModalProps> = ({
  team,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [staff, setStaff] = useState<TeamStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'helper'
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && team?.id) {
      loadStaff();
    }
  }, [isOpen, team?.id]);

  const loadStaff = async () => {
    if (!team?.id) return;
    
    try {
      setLoading(true);
      console.log('Loading staff for team:', team.id);

      const { data: staffData, error } = await supabase
        .from('team_staff')
        .select('*')
        .eq('team_id', team.id);

      if (error) {
        console.error('Error loading staff:', error);
        throw error;
      }

      console.log('Loaded staff data:', staffData);

      const teamStaff: TeamStaff[] = (staffData || []).map(staff => ({
        id: staff.id,
        name: staff.name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        role: staff.role,
        pvgChecked: staff.pvg_checked || false,
        pvgCheckedBy: staff.pvg_checked_by || '',
        pvgCheckedAt: staff.pvg_checked_at || '',
        coachingBadges: Array.isArray(staff.coaching_badges) 
          ? staff.coaching_badges.filter((badge): badge is string => typeof badge === 'string')
          : [],
        certificates: Array.isArray(staff.certificates) ? staff.certificates : []
      }));

      setStaff(teamStaff);
    } catch (error: any) {
      console.error('Error loading staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load staff',
        variant: 'destructive',
      });
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!team?.id || !newStaff.name.trim() || !newStaff.email.trim()) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      console.log('Adding new staff:', newStaff);

      const { data, error } = await supabase
        .from('team_staff')
        .insert([
          {
            team_id: team.id,
            name: newStaff.name.trim(),
            email: newStaff.email.trim(),
            phone: newStaff.phone.trim() || null,
            role: newStaff.role,
            pvg_checked: false,
            coaching_badges: [],
            certificates: []
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error adding staff:', error);
        throw error;
      }

      console.log('Staff added successfully:', data);
      
      // Reset form
      setNewStaff({
        name: '',
        email: '',
        phone: '',
        role: 'helper'
      });
      setIsAddingStaff(false);
      
      // Reload staff
      await loadStaff();
      
      toast({
        title: 'Success',
        description: 'Staff member added successfully',
      });
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add staff member',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) {
      return;
    }

    try {
      console.log('Deleting staff:', staffId);

      const { error } = await supabase
        .from('team_staff')
        .delete()
        .eq('id', staffId);

      if (error) {
        console.error('Error deleting staff:', error);
        throw error;
      }

      await loadStaff();
      toast({
        title: 'Success',
        description: 'Staff member removed successfully',
      });
    } catch (error: any) {
      console.error('Error deleting staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove staff member',
        variant: 'destructive',
      });
    }
  };

  const handlePVGCheck = async (staffId: string, checked: boolean) => {
    try {
      setUpdating(staffId);
      console.log('Updating PVG status for staff:', staffId, checked);

      const updateData = {
        pvg_checked: checked,
        pvg_checked_by: checked ? user?.id : null,
        pvg_checked_at: checked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('team_staff')
        .update(updateData)
        .eq('id', staffId);

      if (error) {
        console.error('Error updating PVG status:', error);
        throw error;
      }

      // Reload staff to reflect changes
      await loadStaff();

      toast({
        title: 'Success',
        description: `PVG status ${checked ? 'checked' : 'unchecked'} successfully`,
      });
    } catch (error: any) {
      console.error('Error updating PVG status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update PVG status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-blue-500';
      case 'assistant_manager': return 'bg-purple-500';
      case 'coach': return 'bg-green-500';
      case 'helper': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatRoleName = (role: string): string => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Staff Management - {team.name}</DialogTitle>
          <DialogDescription>
            Manage coaching staff and their qualifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info about PVG checking */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Info className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Managers and Coaches require PVG verification. Only club administrators can verify PVG status in Club Management.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Add Staff Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Team Staff</CardTitle>
                <Button
                  onClick={() => setIsAddingStaff(!isAddingStaff)}
                  size="sm"
                  className="bg-puma-blue-500 hover:bg-puma-blue-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isAddingStaff && (
                <div className="grid gap-4 p-4 border rounded-lg mb-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      placeholder="Enter staff member name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={newStaff.role} onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}>
                      <SelectTrigger>
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
                  <div className="flex gap-2">
                    <Button onClick={handleAddStaff} disabled={saving}>
                      {saving ? 'Adding...' : 'Add Staff Member'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingStaff(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8">Loading staff...</div>
              ) : staff.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No staff members found. Add some staff to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {staff.map((staffMember) => (
                    <Card key={staffMember.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold">{staffMember.name}</h4>
                                <Badge className={`text-white bg-green-500`}>
                                  {staffMember.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                  <div><strong>Email:</strong> {staffMember.email}</div>
                                  {staffMember.phone && (
                                    <div><strong>Phone:</strong> {staffMember.phone}</div>
                                  )}
                                </div>
                                
                                 <div className="space-y-2">
                                   {/* PVG Check Section - Based on Role Requirements */}
                                   {(() => {
                                     const pvgRequiredRoles = ['manager', 'team_manager', 'coach', 'team_coach', 'team_assistant_manager'];
                                     const requiresPvg = pvgRequiredRoles.includes(staffMember.role);
                                     
                                     if (requiresPvg) {
                                       return (
                                         <div className="space-y-2">
                                           <div className="flex items-center gap-2">
                                             <Checkbox
                                               id={`pvg-${staffMember.id}`}
                                               checked={staffMember.pvgChecked}
                                               disabled={true}
                                             />
                                             <label 
                                               htmlFor={`pvg-${staffMember.id}`}
                                               className="text-sm font-medium text-muted-foreground"
                                             >
                                               PVG Verified (Read Only)
                                             </label>
                                             {staffMember.pvgChecked ? (
                                               <CheckCircle className="h-4 w-4 text-green-600" />
                                             ) : (
                                               <Shield className="h-4 w-4 text-orange-500" />
                                             )}
                                           </div>
                                           {staffMember.pvgChecked && staffMember.pvgCheckedAt && (
                                             <div className="text-xs text-muted-foreground flex items-center gap-1">
                                               <Clock className="h-3 w-3" />
                                               Verified on {new Date(staffMember.pvgCheckedAt).toLocaleDateString('en-US', {
                                                 year: 'numeric',
                                                 month: 'short',
                                                 day: 'numeric'
                                               })}
                                             </div>
                                           )}
                                           {!staffMember.pvgChecked && (
                                             <div className="text-xs text-orange-600">
                                               ⚠️ PVG verification required for this role. Contact club administrator.
                                             </div>
                                           )}
                                         </div>
                                       );
                                     } else {
                                       return (
                                         <div className="flex items-center gap-2">
                                           <div className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                                             ✅ PVG not required for this role
                                           </div>
                                         </div>
                                       );
                                     }
                                   })()}
                                 </div>
                              </div>
                              
                              {/* Coaching Badges */}
                              {staffMember.coachingBadges.length > 0 && (
                                <div className="mt-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Award className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Coaching Badges</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {staffMember.coachingBadges.map((badge, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {badge}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStaff(staffMember.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
