
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { UserRole } from '@/types';

interface RoleSelectorProps {
  selectedRoles: string[];
  onRolesChange: (roles: string[]) => void;
  userEmail?: string;
  className?: string;
}

const availableRoles: { value: UserRole; label: string; description: string }[] = [
  { value: 'global_admin', label: 'Global Admin', description: 'Full system access (restricted)' },
  { value: 'club_admin', label: 'Club Admin', description: 'Manage club and teams' },
  { value: 'team_manager', label: 'Team Manager', description: 'Manage team operations' },
  { value: 'team_assistant_manager', label: 'Assistant Manager', description: 'Assist with team management' },
  { value: 'team_coach', label: 'Coach', description: 'Coach team and manage training' },
  { value: 'team_helper', label: 'Team Helper', description: 'Support team activities' },
  { value: 'parent', label: 'Parent', description: 'Parent of a player' },
  { value: 'player', label: 'Player', description: 'Team player' },
  { value: 'club_chair', label: 'Club Chair', description: 'Club chairperson' },
  { value: 'club_secretary', label: 'Club Secretary', description: 'Club secretary' }
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRoles,
  onRolesChange,
  userEmail,
  className
}) => {
  const isGlobalAdminRestricted = (role: string) => {
    return role === 'global_admin' && userEmail !== 'chrisjpmcdonald@gmail.com';
  };

  const addRole = (role: string) => {
    if (isGlobalAdminRestricted(role)) {
      return;
    }
    
    if (!selectedRoles.includes(role)) {
      onRolesChange([...selectedRoles, role]);
    }
  };

  const removeRole = (role: string) => {
    onRolesChange(selectedRoles.filter(r => r !== role));
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'global_admin': return 'bg-red-500 text-white';
      case 'club_admin': return 'bg-blue-500 text-white';
      case 'team_manager': return 'bg-green-500 text-white';
      case 'team_assistant_manager': return 'bg-green-400 text-white';
      case 'team_coach': return 'bg-purple-500 text-white';
      case 'team_helper': return 'bg-purple-400 text-white';
      case 'parent': return 'bg-pink-500 text-white';
      case 'player': return 'bg-cyan-500 text-white';
      case 'club_chair': return 'bg-blue-600 text-white';
      case 'club_secretary': return 'bg-blue-400 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const availableToAdd = availableRoles.filter(role => 
    !selectedRoles.includes(role.value) && !isGlobalAdminRestricted(role.value)
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Selected Roles */}
      <div className="flex flex-wrap gap-2">
        {selectedRoles.map((role) => {
          const roleInfo = availableRoles.find(r => r.value === role);
          return (
            <Badge
              key={role}
              className={`${getRoleBadgeColor(role)} flex items-center gap-1`}
            >
              {roleInfo?.label || role.replace('_', ' ')}
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 hover:bg-white/20"
                onClick={() => removeRole(role)}
                disabled={isGlobalAdminRestricted(role)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          );
        })}
      </div>

      {/* Add Role Selector */}
      {availableToAdd.length > 0 && (
        <Select value="" onValueChange={addRole}>
          <SelectTrigger>
            <SelectValue placeholder="Add role..." />
          </SelectTrigger>
          <SelectContent>
            {availableToAdd.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                <div>
                  <div className="font-medium">{role.label}</div>
                  <div className="text-xs text-muted-foreground">{role.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Global Admin Restriction Notice */}
      {userEmail && userEmail !== 'chrisjpmcdonald@gmail.com' && (
        <p className="text-xs text-muted-foreground">
          Global Admin role is restricted to chrisjpmcdonald@gmail.com
        </p>
      )}
    </div>
  );
};
