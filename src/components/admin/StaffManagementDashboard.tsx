import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Users, Search, RefreshCw, Trash2, Edit, UserPlus, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StaffMember {
  user_id: string;
  team_id: string;
  team_name: string;
  staff_name: string;
  staff_email: string;
  role: string;
  created_at: string;
}

interface TeamSummary {
  team_id: string;
  team_name: string;
  total_staff: number;
  roles: { [role: string]: number };
}

export const StaffManagementDashboard: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [teamSummaries, setTeamSummaries] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    email: '',
    teamId: '',
    role: ''
  });

  const availableRoles = [
    { value: 'manager', label: 'Manager' },
    { value: 'team_assistant_manager', label: 'Assistant Manager' },
    { value: 'team_coach', label: 'Coach' },
    { value: 'team_helper', label: 'Helper' },
    { value: 'staff', label: 'Staff' }
  ];

  useEffect(() => {
    loadStaffData();
  }, []);

  useEffect(() => {
    filterStaff();
  }, [staff, searchTerm, selectedTeam, selectedRole]);

  const loadStaffData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_staff_roles')
        .select('*')
        .order('team_name', { ascending: true })
        .order('staff_name', { ascending: true });

      if (error) throw error;

      const staffData = data || [];
      setStaff(staffData);

      // Generate team summaries
      const summaries = generateTeamSummaries(staffData);
      setTeamSummaries(summaries);

    } catch (error: any) {
      console.error('Error loading staff data:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const generateTeamSummaries = (staffData: StaffMember[]): TeamSummary[] => {
    const teamMap = new Map<string, TeamSummary>();

    staffData.forEach(staff => {
      if (!teamMap.has(staff.team_id)) {
        teamMap.set(staff.team_id, {
          team_id: staff.team_id,
          team_name: staff.team_name,
          total_staff: 0,
          roles: {}
        });
      }

      const summary = teamMap.get(staff.team_id)!;
      summary.total_staff++;
      summary.roles[staff.role] = (summary.roles[staff.role] || 0) + 1;
    });

    return Array.from(teamMap.values()).sort((a, b) => a.team_name.localeCompare(b.team_name));
  };

  const filterStaff = () => {
    let filtered = staff;

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.staff_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.staff_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.team_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTeam !== 'all') {
      filtered = filtered.filter(s => s.team_id === selectedTeam);
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(s => s.role === selectedRole);
    }

    setFilteredStaff(filtered);
  };

  const handleAddStaff = async () => {
    if (!newStaffData.email || !newStaffData.teamId || !newStaffData.role) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newStaffData.email)
        .single();

      if (userError) {
        toast.error('User not found with this email');
        return;
      }

      // Add to user_teams
      const { error: insertError } = await supabase
        .from('user_teams')
        .insert({
          user_id: userData.id,
          team_id: newStaffData.teamId,
          role: newStaffData.role
        });

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error('This user already has this role for this team');
        } else {
          throw insertError;
        }
        return;
      }

      toast.success('Staff member added successfully');
      setShowAddStaffDialog(false);
      setNewStaffData({ email: '', teamId: '', role: '' });
      await loadStaffData();

    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast.error('Failed to add staff member');
    }
  };

  const handleRemoveStaff = async (userId: string, teamId: string, role: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_teams')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('role', role);

      if (error) throw error;

      toast.success('Staff member removed successfully');
      await loadStaffData();

    } catch (error: any) {
      console.error('Error removing staff:', error);
      toast.error('Failed to remove staff member');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-blue-500 text-white';
      case 'team_assistant_manager': return 'bg-purple-500 text-white';
      case 'team_coach': return 'bg-green-500 text-white';
      case 'team_helper': return 'bg-orange-500 text-white';
      case 'staff': return 'bg-gray-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const formatRoleName = (role: string) => {
    return availableRoles.find(r => r.value === role)?.label || role;
  };

  const uniqueTeams = Array.from(
    new Map(staff.map(s => [s.team_id, { id: s.team_id, name: s.team_name }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Staff Management Dashboard</h2>
          <p className="text-muted-foreground">
            Manage team staff roles and assignments across all teams
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStaffData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showAddStaffDialog} onOpenChange={setShowAddStaffDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">User Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newStaffData.email}
                    onChange={(e) => setNewStaffData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter user email address"
                  />
                </div>
                <div>
                  <Label htmlFor="team">Team</Label>
                  <Select 
                    value={newStaffData.teamId} 
                    onValueChange={(value) => setNewStaffData(prev => ({ ...prev, teamId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueTeams.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={newStaffData.role} 
                    onValueChange={(value) => setNewStaffData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddStaff}>Add Staff</Button>
                  <Button variant="outline" onClick={() => setShowAddStaffDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">All Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                    <p className="text-2xl font-bold">{staff.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Teams</p>
                    <p className="text-2xl font-bold">{uniqueTeams.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Staff/Team</p>
                    <p className="text-2xl font-bold">
                      {uniqueTeams.length > 0 ? Math.round((staff.length / uniqueTeams.length) * 10) / 10 : 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Team Summaries</CardTitle>
              <CardDescription>Staff distribution across teams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamSummaries.map(summary => (
                  <div key={summary.team_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{summary.team_name}</h4>
                      <Badge variant="outline">{summary.total_staff} staff</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(summary.roles).map(([role, count]) => (
                        <Badge key={role} className={getRoleColor(role)}>
                          {formatRoleName(role)}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                
                {teamSummaries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No teams with staff found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="search">Search Staff</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name, email, or team..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="teamFilter">Filter by Team</Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {uniqueTeams.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="roleFilter">Filter by Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {availableRoles.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Staff Members ({filteredStaff.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredStaff.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((member, index) => (
                    <TableRow key={`${member.user_id}-${member.team_id}-${member.role}`}>
                        <TableCell className="font-medium">
                          {member.staff_name || 'Unknown'}
                        </TableCell>
                        <TableCell>{member.staff_email}</TableCell>
                        <TableCell>{member.team_name}</TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(member.role)}>
                            {formatRoleName(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(member.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveStaff(member.user_id, member.team_id, member.role)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Staff Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || selectedTeam !== 'all' || selectedRole !== 'all' 
                      ? 'No staff members match your current filters'
                      : 'No staff members have been added yet'
                    }
                  </p>
                  {searchTerm || selectedTeam !== 'all' || selectedRole !== 'all' ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedTeam('all');
                        setSelectedRole('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  ) : (
                    <Button onClick={() => setShowAddStaffDialog(true)}>
                      Add First Staff Member
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> Database cleanup completed successfully. All "team_manager" roles have been normalized to "manager" and duplicate entries removed. Staff can now be assigned consistently without role conflicts.
        </AlertDescription>
      </Alert>
    </div>
  );
};