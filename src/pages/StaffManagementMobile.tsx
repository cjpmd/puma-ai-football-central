
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, MoreVertical, Users, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  qualifications: string[];
  team_name: string;
}

export default function StaffManagementMobile() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { teams } = useAuth();

  useEffect(() => {
    loadStaff();
  }, [teams]);

  const loadStaff = async () => {
    try {
      if (!teams || teams.length === 0) return;
      
      const { data, error } = await supabase
        .from('team_staff')
        .select(`
          id,
          name,
          role,
          email,
          phone,
          qualifications,
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
        team_name: member.teams?.name || 'Unknown Team'
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

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.team_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'manager':
      case 'head coach':
        return 'bg-blue-500';
      case 'assistant coach':
      case 'coach':
        return 'bg-green-500';
      case 'physio':
      case 'doctor':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Search and Actions */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Button size="sm" className="h-12 px-3">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Staff List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
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
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-lg font-medium">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-lg truncate">{member.name}</h3>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={`text-white text-xs ${getRoleColor(member.role)}`}>
                          {member.role}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {member.team_name}
                        </Badge>
                      </div>
                      {member.qualifications.length > 0 && (
                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                          <Award className="h-3 w-3 mr-1" />
                          <span>{member.qualifications.length} qualification{member.qualifications.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {member.email && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {member.email}
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
    </MobileLayout>
  );
}
