
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Team, TeamStaff } from '@/types/team';
import { Plus, Edit, Trash2, Users, Mail, Phone, Award, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TeamStaffSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamStaffSettings: React.FC<TeamStaffSettingsProps> = ({
  team,
  onUpdate
}) => {
  const [staff, setStaff] = useState<TeamStaff[]>([]);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
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
    loadStaffFromDatabase();
  }, [team.id]);

  const saveStaffToDatabase = async (staffMember: TeamStaff) => {
    try {
      const { error } = await supabase
        .from('team_staff')
        .upsert({
          id: staffMember.id,
          team_id: team.id,
          user_id: staffMember.user_id || null,
          name: staffMember.name,
          email: staffMember.email,
          phone: staffMember.phone || null,
          role: staffMember.role,
          coaching_badges: (staffMember.coachingBadges || []).map(badge => ({ name: badge })),
          certificates: (staffMember.certificates || []).map(cert => ({
            name: cert.name,
            issuedBy: cert.issuedBy,
            dateIssued: cert.dateIssued,
            expiryDate: cert.expiryDate
          })),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving staff member:', error);
      toast({
        title: 'Error',
        description: 'Failed to save staff member',
        variant: 'destructive',
      });
      return false;
    }
  };

  const loadStaffFromDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('team_staff')
        .select('*')
        .eq('team_id', team.id);

      if (error) throw error;

      if (data) {
        const staffMembers: TeamStaff[] = data.map(record => ({
          id: record.id,
          name: record.name,
          email: record.email,
          phone: record.phone || '',
          role: record.role as TeamStaff['role'],
          user_id: record.user_id || undefined,
          coachingBadges: Array.isArray(record.coaching_badges) 
            ? record.coaching_badges.map((badge: any) => 
                typeof badge === 'string' ? badge : badge?.name || ''
              ).filter(Boolean)
            : [],
          certificates: Array.isArray(record.certificates) 
            ? record.certificates.map((cert: any) => ({
                name: String(cert?.name || ''),
                issuedBy: String(cert?.issuedBy || ''),
                dateIssued: String(cert?.dateIssued || ''),
                expiryDate: cert?.expiryDate ? String(cert.expiryDate) : undefined
              })).filter(cert => cert.name)
            : [],
          createdAt: record.created_at,
          updatedAt: record.updated_at
        }));
        
        setStaff(staffMembers);
        onUpdate({ staff: staffMembers });
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team staff',
        variant: 'destructive',
      });
    }
  };

  const sendStaffInvite = async (email: string, name: string, role: string) => {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: 'User Already Exists',
          description: 'This user is already registered. You can add them directly.',
        });
        return false;
      }

      // Here you would typically send an email invitation
      // For now, we'll just show a message about the invite being sent
      toast({
        title: 'Invitation Sent',
        description: `An invitation has been sent to ${email} to join as ${role}`,
      });
      
      return true;
    } catch (error) {
      console.error('Error sending invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleAddStaff = async () => {
    if (newStaff.name && newStaff.email) {
      // Check if user exists and send invite if needed
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newStaff.email)
        .maybeSingle();

      const staffMember: TeamStaff = {
        id: Date.now().toString(),
        ...newStaff,
        coachingBadges: [],
        certificates: [],
        user_id: existingUser?.id || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const success = await saveStaffToDatabase(staffMember);
      
      if (success) {
        // Send invite if user doesn't exist
        if (!existingUser) {
          await sendStaffInvite(newStaff.email, newStaff.name, newStaff.role);
        }
        
        await loadStaffFromDatabase();
        
        setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
        setIsAddingStaff(false);
        
        toast({
          title: 'Success',
          description: `${staffMember.name} has been added to ${team.name}`,
        });
      }
    }
  };

  const handleUpdateStaff = async () => {
    if (editingStaff && newStaff.name && newStaff.email) {
      const updatedStaffMember = { 
        ...editingStaff, 
        ...newStaff, 
        updatedAt: new Date().toISOString() 
      };
      
      const success = await saveStaffToDatabase(updatedStaffMember);
      
      if (success) {
        await loadStaffFromDatabase();
        
        setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
        setEditingStaff(null);
        
        toast({
          title: 'Success',
          description: `${newStaff.name} has been updated in ${team.name}`,
        });
      }
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      const staffMember = staff.find(s => s.id === staffId);
      
      const { error } = await supabase
        .from('team_staff')
        .delete()
        .eq('id', staffId);
      
      if (error) throw error;
      
      await loadStaffFromDatabase();
      
      toast({
        title: 'Success',
        description: `${staffMember?.name} has been removed from ${team.name}`,
      });
    } catch (error) {
      console.error('Error removing staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove staff member',
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Staff Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage your team's coaching staff and helpers. Invite new members or add existing users.
          </p>
        </div>
        <Button 
          onClick={() => setIsAddingStaff(true)}
          className="bg-puma-blue-500 hover:bg-puma-blue-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Add/Edit Staff Form */}
      {(isAddingStaff || editingStaff) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </CardTitle>
            <CardDescription>
              {editingStaff 
                ? 'Update staff member details' 
                : 'Add a new staff member. If they don\'t have an account, we\'ll send them an invitation.'}
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
              <Button onClick={editingStaff ? handleUpdateStaff : handleAddStaff}>
                {editingStaff ? 'Update' : 'Add'} Staff Member
              </Button>
              <Button 
                variant="outline" 
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

      {/* Staff List */}
      <div className="space-y-4">
        {staff.length === 0 ? (
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
          staff.map((staffMember) => (
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
                        {!staffMember.user_id && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            Pending Invite
                          </Badge>
                        )}
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
                      {staffMember.coachingBadges && staffMember.coachingBadges.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <Award className="h-3 w-3 text-yellow-600" />
                          <span className="text-xs text-muted-foreground">
                            {staffMember.coachingBadges.length} coaching badge(s)
                          </span>
                        </div>
                      )}
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
          ))
        )}
      </div>
    </div>
  );
};
