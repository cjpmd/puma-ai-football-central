import { useState, useEffect, useMemo } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Plus, MoreVertical, Users, Award, X, Check, ChevronsUpDown, UserPlus, Mail, Phone, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  qualifications: string[];
  team_name: string;
  team_id: string;
  user_id?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  currentRole: string;
}

type StaffRole = 'manager' | 'assistant_manager' | 'coach' | 'helper';

export default function StaffManagementMobile() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [nameSearchOpen, setNameSearchOpen] = useState(false);
  const [nameSearchValue, setNameSearchValue] = useState('');
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'coach' as StaffRole
  });
  const { toast } = useToast();
  const { teams } = useAuth();

  useEffect(() => {
    loadStaff();
  }, [teams]);

  const loadStaff = async () => {
    try {
      if (!teams || teams.length === 0) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('team_staff')
        .select(`
          id,
          name,
          role,
          email,
          phone,
          qualifications,
          user_id,
          team_id,
          teams:team_id(name)
        `)
        .in('team_id', teams.map(t => t.id))
        .order('name');

      if (error) throw error;
      
      const transformedStaff: StaffMember[] = (data || []).map((member: any) => ({
        id: member.id,
        name: member.name,
        role: member.role || 'Staff',
        email: member.email,
        phone: member.phone,
        qualifications: member.qualifications || [],
        team_name: member.teams?.name || 'Unknown Team',
        team_id: member.team_id,
        user_id: member.user_id
      }));
      
      setStaff(transformedStaff);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load staff',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data: members, error } = await supabase
        .from('user_teams')
        .select(`
          user_id,
          role,
          profiles:user_id(id, name, email)
        `)
        .eq('team_id', teamId);
      
      if (error) throw error;

      const { data: existingStaff } = await supabase
        .from('team_staff')
        .select('user_id')
        .eq('team_id', teamId)
        .not('user_id', 'is', null);

      const existingStaffUserIds = new Set((existingStaff || []).map(s => s.user_id));

      const availableMembers: TeamMember[] = (members || [])
        .filter((m: any) => m.profiles && !existingStaffUserIds.has(m.user_id))
        .map((m: any) => ({
          id: m.user_id,
          name: m.profiles?.name || 'Unknown',
          email: m.profiles?.email || '',
          currentRole: formatRoleForDisplay(m.role)
        }));

      setTeamMembers(availableMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const formatRoleForDisplay = (role: string): string => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleOpenAddStaff = (teamId: string) => {
    setSelectedTeamId(teamId);
    setIsAddingStaff(true);
    setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
    setSelectedUser(null);
    setNameSearchValue('');
    loadTeamMembers(teamId);
  };

  const handleSelectTeamMember = (member: TeamMember) => {
    setSelectedUser(member);
    setNewStaff({
      ...newStaff,
      name: member.name,
      email: member.email,
      phone: member.phone || ''
    });
    setNameSearchOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setNewStaff({ name: '', email: '', phone: '', role: newStaff.role });
    setNameSearchValue('');
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

    if (!selectedUser && !newStaff.email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Email is required for new staff members',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTeamId) {
      toast({
        title: 'Error',
        description: 'No team selected',
        variant: 'destructive',
      });
      return;
    }

    try {
      let userId = selectedUser?.id || null;
      
      if (!selectedUser && newStaff.email.trim()) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', newStaff.email.trim().toLowerCase())
          .maybeSingle();
        
        if (existingUser) {
          userId = existingUser.id;
        }
      }

      const { error } = await supabase
        .from('team_staff')
        .insert({
          team_id: selectedTeamId,
          name: newStaff.name.trim(),
          email: newStaff.email.trim() || null,
          phone: newStaff.phone.trim() || null,
          role: newStaff.role,
          user_id: userId,
        });

      if (error) throw error;

      if (userId) {
        await supabase
          .from('user_teams')
          .upsert({
            user_id: userId,
            team_id: selectedTeamId,
            role: newStaff.role
          }, { 
            onConflict: 'user_id,team_id',
            ignoreDuplicates: false 
          });
      }

      setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
      setSelectedUser(null);
      setNameSearchValue('');
      setIsAddingStaff(false);
      setSelectedTeamId(null);
      await loadStaff();
      
      const message = userId 
        ? `${newStaff.name} has been added and linked to the team`
        : `${newStaff.name} has been added. They will be linked when they sign up.`;
      
      toast({
        title: 'Staff Added',
        description: message,
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
    if (!confirm(`Remove ${staffName}?`)) return;
    
    try {
      const { error } = await supabase
        .from('team_staff')
        .delete()
        .eq('id', staffId);
      
      if (error) throw error;
      
      await loadStaff();
      
      toast({
        title: 'Success',
        description: `${staffName} has been removed`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove staff member',
        variant: 'destructive',
      });
    }
  };

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.team_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeamMembers = useMemo(() => {
    if (!nameSearchValue) return teamMembers;
    const search = nameSearchValue.toLowerCase();
    return teamMembers.filter(m => 
      m.name.toLowerCase().includes(search) ||
      m.email.toLowerCase().includes(search)
    );
  }, [teamMembers, nameSearchValue]);

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'manager':
        return 'bg-blue-500';
      case 'assistant_manager':
        return 'bg-purple-500';
      case 'coach':
        return 'bg-green-500';
      case 'helper':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get unique team IDs for the "Add to which team?" selector
  const userTeams = teams || [];

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Search and Actions */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          {userTeams.length === 1 ? (
            <Button 
              size="sm" 
              className="h-12 px-3"
              onClick={() => handleOpenAddStaff(userTeams[0].id)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : userTeams.length > 1 ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" className="h-12 px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <p className="text-sm font-medium mb-2">Add staff to:</p>
                {userTeams.map(team => (
                  <Button
                    key={team.id}
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={() => handleOpenAddStaff(team.id)}
                  >
                    {team.name}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>
          ) : null}
        </div>

        {/* Staff List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading staff...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No staff members found</p>
            </div>
          ) : (
            filteredStaff.map((member) => (
              <Card key={member.id} className="touch-manipulation">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className={cn(
                      "h-12 w-12",
                      member.user_id ? "ring-2 ring-green-500" : "ring-2 ring-orange-300"
                    )}>
                      <AvatarFallback className="text-lg font-medium">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-lg truncate">{member.name}</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600"
                          onClick={() => handleRemoveStaff(member.id, member.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        <Badge className={`text-white text-xs ${getRoleColor(member.role)}`}>
                          {getRoleLabel(member.role)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {member.team_name}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            member.user_id 
                              ? "text-green-600 border-green-600" 
                              : "text-orange-600 border-orange-600"
                          )}
                        >
                          {member.user_id ? 'Linked' : 'Not Linked'}
                        </Badge>
                      </div>
                      {member.qualifications && member.qualifications.length > 0 && (
                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                          <Award className="h-3 w-3 mr-1" />
                          <span>{member.qualifications.length} qualification{member.qualifications.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {member.email && (
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Mail className="h-3 w-3 mr-1" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Staff Sheet */}
      <Sheet open={isAddingStaff} onOpenChange={setIsAddingStaff}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Add Staff Member</SheetTitle>
            <SheetDescription>
              Search for an existing team member or add a new staff member.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 mt-4">
            {/* Name field with search */}
            <div className="space-y-2">
              <Label htmlFor="staffName">Name *</Label>
              <Popover open={nameSearchOpen} onOpenChange={setNameSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={nameSearchOpen}
                    className="w-full justify-between h-12 font-normal"
                  >
                    {selectedUser ? (
                      <span className="flex items-center gap-2">
                        {selectedUser.name}
                        <Badge variant="secondary" className="text-xs">
                          {selectedUser.currentRole}
                        </Badge>
                      </span>
                    ) : newStaff.name ? (
                      <span>{newStaff.name} (New)</span>
                    ) : (
                      <span className="text-muted-foreground">Search or type name...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search team members..." 
                      value={nameSearchValue}
                      onValueChange={setNameSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {nameSearchValue && (
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              setNewStaff(prev => ({ ...prev, name: nameSearchValue }));
                              setSelectedUser(null);
                              setNameSearchOpen(false);
                            }}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add "{nameSearchValue}" as new staff
                          </Button>
                        )}
                      </CommandEmpty>
                      {filteredTeamMembers.length > 0 && (
                        <CommandGroup heading="Existing Team Members">
                          {filteredTeamMembers.map((member) => (
                            <CommandItem
                              key={member.id}
                              onSelect={() => handleSelectTeamMember(member)}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedUser?.id === member.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{member.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {member.currentRole} • {member.email}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {nameSearchValue && (
                        <CommandGroup heading="Or add new">
                          <CommandItem
                            onSelect={() => {
                              setNewStaff(prev => ({ ...prev, name: nameSearchValue }));
                              setSelectedUser(null);
                              setNameSearchOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add "{nameSearchValue}" as new staff
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedUser && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={handleClearSelection}
                >
                  Clear selection
                </Button>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="staffEmail">
                Email {!selectedUser && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="staffEmail"
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                className="h-12"
                disabled={!!selectedUser}
              />
              {!selectedUser && (
                <p className="text-xs text-muted-foreground">
                  Used to automatically link when they sign up
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="staffPhone">Phone (optional)</Label>
              <Input
                id="staffPhone"
                value={newStaff.phone}
                onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
                className="h-12"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="staffRole">Role</Label>
              <Select 
                value={newStaff.role}
                onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value as StaffRole }))}
              >
                <SelectTrigger id="staffRole" className="h-12">
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

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleAddStaff} 
                className="flex-1 h-12"
              >
                Add Staff Member
              </Button>
              <Button 
                variant="outline" 
                className="h-12"
                onClick={() => {
                  setIsAddingStaff(false);
                  setSelectedTeamId(null);
                  setSelectedUser(null);
                  setNameSearchValue('');
                  setNewStaff({ name: '', email: '', phone: '', role: 'coach' });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
}
