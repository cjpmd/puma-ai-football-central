
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Team, Staff } from '@/types';
import { Plus, Trash2, Users, Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SimpleStaffModalProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const SimpleStaffModal: React.FC<SimpleStaffModalProps> = ({
  team,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'coach' as Staff['role']
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && team?.id) {
      loadStaff();
    }
  }, [isOpen, team?.id]);

  const loadStaff = async () => {
    if (!team?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_staff')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at');

      if (error) throw error;

      const staffMembers: Staff[] = (data || []).map(record => ({
        id: record.id,
        name: record.name || '',
        email: record.email || '',
        phone: record.phone || '',
        role: record.role as Staff['role'],
        team_id: team.id,
        user_id: record.user_id || undefined,
        coachingBadges: [],
        certificates: [],
        createdAt: record.created_at,
        updatedAt: record.updated_at
      }));
      
      setStaff(staffMembers);
    } catch (error: any) {
      console.error('Error loading staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team staff',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name.trim() || !newStaff.email.trim()) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('team_staff')
        .insert({
          team_id: team.id,
          name: newStaff.name.trim(),
          email: newStaff.email.trim(),
          phone: newStaff.phone.trim() || null,
          role: newStaff.role,
          coaching_badges: [],
          certificates: []
        });

      if (error) throw error;
      
      await loadStaff();
      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      setIsAddingStaff(false);
      
      toast({
        title: 'Success',
        description: 'Staff member added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add staff member',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveStaff = async (staffId: string, staffName: string) => {
    try {
      const { error } = await supabase
        .from('team_staff')
        .delete()
        .eq('id', staffId);
      
      if (error) throw error;
      
      await loadStaff();
      toast({
        title: 'Success',
        description: `${staffName} removed successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to remove staff member',
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

  if (!team) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Staff Management - {team.name}</DialogTitle>
          <DialogDescription>
            Manage your team's coaching staff and helpers.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Team Staff</h3>
            <Button 
              onClick={() => setIsAddingStaff(true)}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </div>

          {isAddingStaff && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={newStaff.name}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Email address"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select 
                      value={newStaff.role}
                      onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value as Staff['role'] }))}
                    >
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
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleAddStaff}>Add Staff</Button>
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
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Loading staff...</p>
            </div>
          ) : staff.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Staff Added</h3>
                <p className="text-muted-foreground mb-4">
                  Add your team's coaching staff and helpers.
                </p>
                <Button onClick={() => setIsAddingStaff(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {staff.map((staffMember) => (
                <Card key={staffMember.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
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
                          if (confirm(`Remove ${staffMember.name}?`)) {
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
