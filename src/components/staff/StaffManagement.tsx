
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Phone, Mail, Calendar, Link2, UserPlus, RefreshCw } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  team_name: string;
  team_id: string;
  email?: string;
  phone?: string;
  linked_user_id?: string;
  linked_user_name?: string;
  coaching_badges?: any[];
}

export const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { canViewStaff, isStaffMember } = useAuthorization();
  const { toast } = useToast();

  useEffect(() => {
    if (canViewStaff || isStaffMember) {
      loadStaff();
    }
  }, [canViewStaff, isStaffMember]);

  useEffect(() => {
    filterStaff();
  }, [staff, searchTerm]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      console.log('Loading all staff members...');

      // Get ALL team staff with better error handling
      const { data: staffData, error: staffError } = await supabase
        .from('team_staff')
        .select(`
          id,
          name,
          role,
          team_id,
          email,
          phone,
          teams!inner(name)
        `)
        .order('name');

      if (staffError) {
        console.error('Error fetching staff:', staffError);
        throw staffError;
      }

      console.log('Raw staff data:', staffData?.length || 0, staffData);

      // Get user-staff links to see which staff members have user accounts
      const { data: userStaffLinks, error: linksError } = await supabase
        .from('user_staff')
        .select(`
          staff_id,
          user_id,
          profiles!inner(name, email, phone)
        `);

      if (linksError) {
        console.error('Error fetching user-staff links:', linksError);
      }

      console.log('User-staff links:', userStaffLinks?.length || 0);

      // Combine the data with better null checking
      const staffWithUserInfo: StaffMember[] = (staffData || []).map(staffMember => {
        const userLink = userStaffLinks?.find(link => link.staff_id === staffMember.id);
        
        return {
          id: staffMember.id,
          name: staffMember.name || 'Unknown',
          role: staffMember.role || 'Unknown Role',
          team_name: (staffMember as any).teams?.name || 'Unknown Team',
          team_id: staffMember.team_id,
          email: staffMember.email || (userLink as any)?.profiles?.email,
          phone: staffMember.phone || (userLink as any)?.profiles?.phone,
          linked_user_id: userLink?.user_id,
          linked_user_name: (userLink as any)?.profiles?.name,
        };
      });

      console.log('Processed staff with user info:', staffWithUserInfo);
      setStaff(staffWithUserInfo);
    } catch (error: any) {
      console.error('Error loading staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load staff',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = staff;

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredStaff(filtered);
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'manager': return 'bg-green-500';
      case 'assistant manager': return 'bg-green-400';
      case 'coach': return 'bg-purple-500';
      case 'goalkeeper coach': return 'bg-purple-400';
      case 'fitness coach': return 'bg-orange-500';
      case 'physio': return 'bg-blue-500';
      case 'kit manager': return 'bg-gray-500';
      default: return 'bg-gray-600';
    }
  };

  if (!canViewStaff && !isStaffMember) {
    return (
      <Card className="p-8 text-center">
        <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">
          You don't have permission to view staff information.
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Staff Directory</h2>
          <p className="text-muted-foreground">
            View all staff members across teams ({staff.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadStaff} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search staff by name, role, team, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Debug Info */}
      <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
        Debug: Found {staff.length} staff members, showing {filteredStaff.length} after filtering
      </div>

      {/* Staff List */}
      <div className="grid gap-4">
        {filteredStaff.map((member) => (
          <Card key={member.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-puma-blue-100 text-puma-blue-800">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {member.name}
                    </h3>
                    <Badge className={`${getRoleColor(member.role)} text-white text-xs`}>
                      {member.role}
                    </Badge>
                    {member.linked_user_id && (
                      <Badge variant="outline" className="text-xs">
                        <Link2 className="h-3 w-3 mr-1" />
                        Linked User
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{member.team_name}</span>
                    </div>
                    
                    {member.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{member.email}</span>
                      </div>
                    )}
                    
                    {member.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    
                    {member.linked_user_name && (
                      <div className="text-xs text-blue-600">
                        Linked to: {member.linked_user_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* No staff found */}
        {filteredStaff.length === 0 && (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No staff found</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Try adjusting your search criteria.'
                : 'No staff members have been added to teams yet.'
              }
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
