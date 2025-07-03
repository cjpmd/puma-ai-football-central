import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Phone, Shield } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  created_at: string;
  teams: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  clubs: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  playerLinks: Array<{
    id: string;
    name: string;
    team: string;
    relationship: string;
  }>;
  staffLinks: Array<{
    id: string;
    name: string;
    team: string;
    role: string;
    relationship: string;
  }>;
}

interface UserEditModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

const availableRoles = [
  { id: 'global_admin', label: 'Global Admin', description: 'Full system access' },
  { id: 'club_admin', label: 'Club Admin', description: 'Manage club settings' },
  { id: 'team_manager', label: 'Team Manager', description: 'Manage team operations' },
  { id: 'coach', label: 'Coach', description: 'Team coaching responsibilities' },
  { id: 'staff', label: 'Staff', description: 'Team support staff' },
  { id: 'parent', label: 'Parent', description: 'Player parent/guardian' },
  { id: 'player', label: 'Player', description: 'Team player' },
];

export const UserEditModal: React.FC<UserEditModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdated
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    roles: user?.roles || []
  });

  // Update form when user changes
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        roles: user.roles || []
      });
    }
  }, [user]);

  const handleRoleChange = (roleId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...prev.roles, roleId]
        : prev.roles.filter(r => r !== roleId)
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      console.log('Updating user:', user.id, 'with data:', formData);
      
      // Remove specific team manager roles if team_manager role is being removed
      if (!formData.roles.includes('team_manager')) {
        const { error: deleteTeamManagerError } = await supabase
          .from('user_teams')
          .delete()
          .eq('user_id', user.id)
          .eq('role', 'team_manager');

        if (deleteTeamManagerError) {
          console.error('Error removing team manager roles:', deleteTeamManagerError);
        }
      }

      // Update the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          roles: formData.roles,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      // Re-add team manager roles if selected (only for teams they previously managed)
      if (formData.roles.includes('team_manager')) {
        const userTeams = user.teams.filter(team => team.role === 'team_manager');
        for (const team of userTeams) {
          const { error: teamRoleError } = await supabase
            .from('user_teams')
            .upsert({
              user_id: user.id,
              team_id: team.id,
              role: 'team_manager'
            });

          if (teamRoleError) {
            console.error('Error re-adding team manager role:', teamRoleError);
          }
        }
      }

      toast({
        title: 'User Updated',
        description: `${formData.name}'s profile has been updated successfully`,
      });

      onUserUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Update Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit User - {user.name}
          </DialogTitle>
          <DialogDescription>
            Update user information and manage their roles and permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="user@example.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles & Permissions
              </CardTitle>
              <CardDescription>
                Select the roles this user should have. Multiple roles can be assigned.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableRoles.map((role) => (
                  <div key={role.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id={role.id}
                      checked={formData.roles.includes(role.id)}
                      onCheckedChange={(checked) => handleRoleChange(role.id, !!checked)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor={role.id} className="text-sm font-medium cursor-pointer">
                        {role.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {role.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Associations */}
          {(user.teams.length > 0 || user.clubs.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Current Associations</CardTitle>
                <CardDescription>
                  Teams and clubs this user is currently associated with.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.teams.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Teams:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {user.teams.map((team) => (
                        <div key={team.id} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {team.name} ({team.role})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {user.clubs.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Clubs:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {user.clubs.map((club) => (
                        <div key={club.id} className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {club.name} ({club.role})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};