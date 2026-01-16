import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, Building2, Users, Trophy, Calendar, 
  BarChart3, Settings, UserCog, Shirt, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Club } from '@/types/index';

// Import management components
import { ClubSummaryReport } from '@/components/clubs/ClubSummaryReport';
import { ClubStaffManagement } from '@/components/clubs/ClubStaffManagement';
import { ClubTeamLinking } from '@/components/clubs/ClubTeamLinking';
import { ClubPlayerManagement } from '@/components/clubs/ClubPlayerManagement';
import { ClubKitOverview } from '@/components/clubs/ClubKitOverview';
import { YearGroupManagement } from '@/components/clubs/YearGroupManagement';
import { useAuth } from '@/contexts/AuthContext';

export default function ClubDetailsMobile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUserData } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    if (id) {
      loadClub();
    }
  }, [id]);

  const loadClub = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setClub({
        id: data.id,
        name: data.name,
        serialNumber: data.serial_number,
        referenceNumber: data.reference_number,
        subscriptionType: (data.subscription_type || 'free') as Club['subscriptionType'],
        logoUrl: data.logo_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      });
    } catch (error: any) {
      console.error('Error loading club:', error);
      toast({
        title: 'Error',
        description: 'Failed to load club details',
        variant: 'destructive',
      });
      navigate('/clubs');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <MobileLayout headerTitle="Club Details">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (!club) {
    return (
      <MobileLayout headerTitle="Club Details">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Club not found</p>
          <Button variant="link" onClick={() => navigate('/clubs')}>
            Return to Clubs
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-4 pb-20">
        {/* Back Button */}
        <button
          onClick={() => navigate('/clubs')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Clubs
        </button>

        {/* Club Header */}
        <div className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-sm">
          <Avatar className="h-16 w-16">
            {club.logoUrl ? (
              <AvatarImage src={club.logoUrl} alt={club.name} />
            ) : (
              <AvatarFallback className="text-xl font-bold">
                {getInitials(club.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{club.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize">
                {club.subscriptionType}
              </Badge>
              {club.serialNumber && (
                <Badge variant="secondary" className="font-mono text-xs">
                  #{club.serialNumber}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="w-max inline-flex">
              <TabsTrigger value="summary" className="gap-1.5">
                <FileText className="h-4 w-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="teams" className="gap-1.5">
                <Trophy className="h-4 w-4" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="players" className="gap-1.5">
                <Users className="h-4 w-4" />
                Players
              </TabsTrigger>
              <TabsTrigger value="staff" className="gap-1.5">
                <UserCog className="h-4 w-4" />
                Staff
              </TabsTrigger>
              <TabsTrigger value="kit" className="gap-1.5">
                <Shirt className="h-4 w-4" />
                Kit
              </TabsTrigger>
              <TabsTrigger value="year-groups" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Year Groups
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="summary" className="mt-4">
            <ClubSummaryReport clubId={club.id} clubName={club.name} />
          </TabsContent>

          <TabsContent value="teams" className="mt-4">
            <ClubTeamLinking 
              clubId={club.id} 
              clubName={club.name}
              onTeamLinked={() => refreshUserData()}
            />
          </TabsContent>

          <TabsContent value="players" className="mt-4">
            <ClubPlayerManagement clubId={club.id} clubName={club.name} />
          </TabsContent>

          <TabsContent value="staff" className="mt-4">
            <ClubStaffManagement clubId={club.id} clubName={club.name} />
          </TabsContent>

          <TabsContent value="kit" className="mt-4">
            <ClubKitOverview clubId={club.id} clubName={club.name} />
          </TabsContent>

          <TabsContent value="year-groups" className="mt-4">
            <YearGroupManagement clubId={club.id} />
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
