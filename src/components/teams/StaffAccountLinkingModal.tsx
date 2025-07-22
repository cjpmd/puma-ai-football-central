import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Link, Unlink, Mail, User, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  linkedUserId?: string;
  linkedUserName?: string;
  linkedUserEmail?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface StaffAccountLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
}

export const StaffAccountLinkingModal: React.FC<StaffAccountLinkingModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamName
}) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadStaffAndUsers();
    }
  }, [isOpen, teamId]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredUsers(
        users.filter(user =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredUsers([]);
    }
  }, [searchTerm, users]);

  const loadStaffAndUsers = async () => {
    setLoading(true);
    try {
      // Load team staff
      const { data: staffData, error: staffError } = await supabase
        .from('team_staff')
        .select('id, name, email, role')
        .eq('team_id', teamId);

      if (staffError) throw staffError;

      // Load user_staff links
      const { data: userStaffLinks, error: userStaffError } = await supabase
        .from('user_staff')
        .select('user_id, staff_id')
        .in('staff_id', (staffData || []).map(s => s.id));

      if (userStaffError) throw userStaffError;

      // Load linked user profiles
      const linkedUserIds = userStaffLinks?.map(link => link.user_id) || [];
      let linkedProfiles: { id: string; name: string; email: string; }[] = [];
      
      if (linkedUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', linkedUserIds);

        if (profilesError) throw profilesError;
        linkedProfiles = profilesData || [];
      }

      // Combine the data
      const transformedStaff: StaffMember[] = (staffData || []).map(staff => {
        const userLink = userStaffLinks?.find(link => link.staff_id === staff.id);
        const profile = userLink ? linkedProfiles.find(p => p.id === userLink.user_id) : null;
        
        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          linkedUserId: userLink?.user_id,
          linkedUserName: profile?.name,
          linkedUserEmail: profile?.email
        };
      });

      setStaff(transformedStaff);

      // Load all users for linking
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .not('name', 'is', null)
        .order('name');

      if (usersError) throw usersError;

      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading staff and users:', error);
      toast.error('Failed to load staff and user data');
    } finally {
      setLoading(false);
    }
  };

  const linkUserToStaff = async (staffId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('user_staff')
        .insert({
          user_id: userId,
          staff_id: staffId
        });

      if (error) throw error;

      toast.success('User linked to staff member successfully');
      await loadStaffAndUsers();
      setSearchTerm('');
      setSelectedStaffId(null);
    } catch (error: any) {
      console.error('Error linking user to staff:', error);
      if (error.code === '23505') {
        toast.error('This user is already linked to this staff member');
      } else {
        toast.error('Failed to link user to staff member');
      }
    }
  };

  const unlinkUserFromStaff = async (staffId: string) => {
    try {
      const { error } = await supabase
        .from('user_staff')
        .delete()
        .eq('staff_id', staffId);

      if (error) throw error;

      toast.success('User unlinked from staff member');
      await loadStaffAndUsers();
    } catch (error) {
      console.error('Error unlinking user from staff:', error);
      toast.error('Failed to unlink user from staff member');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'coach':
      case 'head_coach':
        return 'bg-blue-100 text-blue-800';
      case 'assistant_coach':
        return 'bg-green-100 text-green-800';
      case 'manager':
      case 'team_manager':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Staff Account Linking - {teamName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading staff and user data...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Staff Account Linking - {teamName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Link staff members to user accounts to enable availability management
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Staff Members List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Team Staff Members</h3>
            
            {staff.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    No staff members found for this team.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {staff.map((staffMember) => (
                  <Card key={staffMember.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{staffMember.name}</span>
                              <Badge className={getRoleColor(staffMember.role)}>
                                {formatRole(staffMember.role)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {staffMember.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {staffMember.linkedUserId ? (
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-sm font-medium text-green-700">
                                  Linked to: {staffMember.linkedUserName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {staffMember.linkedUserEmail}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => unlinkUserFromStaff(staffMember.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Unlink className="h-4 w-4" />
                                Unlink
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedStaffId(staffMember.id)}
                            >
                              <Link className="h-4 w-4 mr-2" />
                              Link User
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* User Search and Linking */}
          {selectedStaffId && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Link User Account</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStaffId(null)}
                >
                  Cancel
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {filteredUsers.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => linkUserToStaff(selectedStaffId, user.id)}
                      >
                        Link
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchTerm && filteredUsers.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  No users found matching your search.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};