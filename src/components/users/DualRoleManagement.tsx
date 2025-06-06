import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, UserCog, AlertTriangle } from 'lucide-react';

interface DualRoleUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  staff_links: Array<{
    id: string;
    name: string;
    role: string;
    team_name: string;
  }>;
  player_links: Array<{
    id: string;
    name: string;
    team_name: string;
    relationship: string;
  }>;
}

interface RoleConflict {
  user_id: string;
  user_name: string;
  user_email: string;
  conflicts: Array<{
    type: 'staff_and_parent';
    staff_teams: string[];
    parent_teams: string[];
  }>;
}

export const DualRoleManagement: React.FC = () => {
  const [dualRoleUsers, setDualRoleUsers] = useState<DualRoleUser[]>([]);
  const [roleConflicts, setRoleConflicts] = useState<RoleConflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDualRoleUsers();
    detectRoleConflicts();
  }, []);

  const loadDualRoleUsers = async () => {
    try {
      // Get users with multiple roles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .or('roles.cs.{staff,parent}');

      if (error) throw error;

      const dualUsers: DualRoleUser[] = [];

      for (const profile of profiles || []) {
        if (profile.roles && profile.roles.length > 1) {
          // Get staff links
          const { data: staffLinks } = await supabase
            .from('user_staff')
            .select(`
              staff_id,
              team_staff!inner(id, name, role, team_id, teams!inner(name))
            `)
            .eq('user_id', profile.id);

          // Get player links (as parent)
          const { data: playerLinks } = await supabase
            .from('user_players')
            .select(`
              player_id, relationship,
              players!inner(id, name, team_id, teams!inner(name))
            `)
            .eq('user_id', profile.id)
            .in('relationship', ['parent', 'guardian']);

          dualUsers.push({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            roles: profile.roles,
            staff_links: staffLinks?.map(link => ({
              id: (link as any).team_staff.id,
              name: (link as any).team_staff.name,
              role: (link as any).team_staff.role,
              team_name: (link as any).team_staff.teams.name
            })) || [],
            player_links: playerLinks?.map(link => ({
              id: (link as any).players.id,
              name: (link as any).players.name,
              team_name: (link as any).players.teams.name,
              relationship: link.relationship
            })) || []
          });
        }
      }

      setDualRoleUsers(dualUsers);
    } catch (error) {
      console.error('Error loading dual role users:', error);
      toast.error('Failed to load dual role users');
    }
  };

  const detectRoleConflicts = async () => {
    try {
      // Detect users who are staff on one team but parent on another
      const conflicts: RoleConflict[] = [];

      for (const user of dualRoleUsers) {
        if (user.staff_links.length > 0 && user.player_links.length > 0) {
          const staffTeams = user.staff_links.map(link => link.team_name);
          const parentTeams = user.player_links.map(link => link.team_name);
          
          // Check for overlapping teams
          const overlappingTeams = staffTeams.filter(team => parentTeams.includes(team));
          
          if (overlappingTeams.length > 0) {
            conflicts.push({
              user_id: user.id,
              user_name: user.name,
              user_email: user.email,
              conflicts: [{
                type: 'staff_and_parent',
                staff_teams: staffTeams,
                parent_teams: parentTeams
              }]
            });
          }
        }
      }

      setRoleConflicts(conflicts);
    } catch (error) {
      console.error('Error detecting role conflicts:', error);
    }
  };

  const resolveConflict = async (userId: string, resolution: 'prioritize_staff' | 'prioritize_parent' | 'separate_teams') => {
    setIsLoading(true);
    try {
      const user = dualRoleUsers.find(u => u.id === userId);
      if (!user) throw new Error('User not found');

      if (resolution === 'prioritize_staff') {
        // Remove parent role, keep staff role
        const newRoles = user.roles.filter(role => role !== 'parent');
        await supabase
          .from('profiles')
          .update({ roles: newRoles })
          .eq('id', userId);

        toast.success('Prioritized staff role for user');
      } else if (resolution === 'prioritize_parent') {
        // Remove staff role, keep parent role
        const newRoles = user.roles.filter(role => role !== 'staff');
        await supabase
          .from('profiles')
          .update({ roles: newRoles })
          .eq('id', userId);

        toast.success('Prioritized parent role for user');
      }

      loadDualRoleUsers();
      detectRoleConflicts();
    } catch (error: any) {
      console.error('Error resolving conflict:', error);
      toast.error(error.message || 'Failed to resolve conflict');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Dual Role Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Manage users who have multiple roles (e.g., staff member who is also a parent).
          </p>
          
          {roleConflicts.length > 0 && (
            <div className="mb-6 p-4 border border-orange-200 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800">
                  {roleConflicts.length} Role Conflict(s) Detected
                </span>
              </div>
              <p className="text-sm text-orange-700">
                Some users have conflicting roles that may need resolution.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {roleConflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Role Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roleConflicts.map(conflict => (
                <div key={conflict.user_id} className="p-4 border border-orange-200 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{conflict.user_name}</h4>
                      <p className="text-sm text-muted-foreground">{conflict.user_email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveConflict(conflict.user_id, 'prioritize_staff')}
                        disabled={isLoading}
                      >
                        Prioritize Staff
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveConflict(conflict.user_id, 'prioritize_parent')}
                        disabled={isLoading}
                      >
                        Prioritize Parent
                      </Button>
                    </div>
                  </div>
                  
                  {conflict.conflicts.map((conf, index) => (
                    <div key={index} className="text-sm">
                      <p className="mb-1">
                        <strong>Staff on:</strong> {conf.staff_teams.join(', ')}
                      </p>
                      <p>
                        <strong>Parent on:</strong> {conf.parent_teams.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users with Multiple Roles ({dualRoleUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dualRoleUsers.map(user => (
              <div key={user.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">{user.name}</h4>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex gap-1 mt-1">
                      {user.roles.map(role => (
                        <Badge key={role} variant="outline">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.staff_links.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm mb-2">Staff Roles:</h5>
                      <div className="space-y-1">
                        {user.staff_links.map(link => (
                          <div key={link.id} className="text-sm p-2 bg-blue-50 rounded">
                            <div className="font-medium">{link.name}</div>
                            <div className="text-muted-foreground">
                              {link.role} at {link.team_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {user.player_links.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm mb-2">Parent/Guardian Of:</h5>
                      <div className="space-y-1">
                        {user.player_links.map(link => (
                          <div key={link.id} className="text-sm p-2 bg-green-50 rounded">
                            <div className="font-medium">{link.name}</div>
                            <div className="text-muted-foreground">
                              {link.relationship} at {link.team_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
