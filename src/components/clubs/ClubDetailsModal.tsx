
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Club } from '@/types';
import { ClubStaffManagement } from './ClubStaffManagement';
import { ClubTeamsOverview } from './ClubTeamsOverview';
import { ClubCalendar } from './ClubCalendar';

interface ClubDetailsModalProps {
  club: Club | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ClubDetailsModal: React.FC<ClubDetailsModalProps> = ({
  club,
  isOpen,
  onClose
}) => {
  if (!club) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{club.name} - Management</DialogTitle>
          <DialogDescription>
            Comprehensive management view for {club.name}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <ClubTeamsOverview
              clubId={club.id}
              clubName={club.name}
            />
          </TabsContent>
          
          <TabsContent value="staff" className="space-y-6">
            <ClubStaffManagement
              clubId={club.id}
              clubName={club.name}
            />
          </TabsContent>
          
          <TabsContent value="calendar" className="space-y-6">
            <ClubCalendar
              clubId={club.id}
              clubName={club.name}
            />
          </TabsContent>
          
          <TabsContent value="facilities" className="space-y-6">
            <div className="text-center py-8 text-muted-foreground">
              Facilities management coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
