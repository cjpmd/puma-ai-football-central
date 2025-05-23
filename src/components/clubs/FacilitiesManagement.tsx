
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, Calendar } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FacilityForm } from './FacilityForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Facility } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface FacilitiesManagementProps {
  clubId: string;
  onRefreshClub?: () => void;
}

export const FacilitiesManagement = ({ clubId, onRefreshClub }: FacilitiesManagementProps) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('list');
  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadFacilities();
    }
  }, [clubId]);

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('club_id', clubId)
        .order('name');

      if (error) throw error;
      
      // Transform database fields to match interface
      const transformedFacilities: Facility[] = (data || []).map(facility => ({
        id: facility.id,
        clubId: facility.club_id,
        name: facility.name,
        description: facility.description,
        bookableUnits: facility.bookable_units,
        createdAt: facility.created_at,
        updatedAt: facility.updated_at
      }));
      
      setFacilities(transformedFacilities);
    } catch (error) {
      console.error('Error loading facilities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load facilities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (facility?: Facility) => {
    setSelectedFacility(facility);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    loadFacilities();
    if (onRefreshClub) onRefreshClub();
  };

  const handleDeleteFacility = async (id: string) => {
    try {
      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Facility deleted',
        description: 'Facility has been successfully removed',
      });
      
      loadFacilities();
      if (onRefreshClub) onRefreshClub();
    } catch (error) {
      console.error('Error deleting facility:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete facility',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Club Facilities</h3>
        <Button 
          size="sm" 
          onClick={() => handleOpenForm()}
          className="bg-puma-blue-500 hover:bg-puma-blue-600"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Facility
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Facility List</TabsTrigger>
          <TabsTrigger value="calendar">Availability Calendar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-4">
          {loading ? (
            <div className="text-center py-4">Loading facilities...</div>
          ) : facilities.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No facilities have been added yet. Create your first facility for team bookings.
                </p>
                <Button 
                  onClick={() => handleOpenForm()}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add a Facility
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {facilities.map((facility) => (
                  <Card key={facility.id} className="group hover:border-primary transition-colors">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center">
                        {facility.name}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {facility.bookableUnits === 'hours' ? 'Hourly' : 
                           facility.bookableUnits === 'sessions' ? 'Sessions' : 'Daily'}
                        </Badge>
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenForm(facility)} className="opacity-0 group-hover:opacity-100">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" 
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${facility.name}"?`)) {
                              handleDeleteFacility(facility.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2 px-4 border-t text-sm text-muted-foreground">
                      {facility.description || 'No description provided'}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
        
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-center h-[300px]">
                <div className="flex flex-col items-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mb-2" />
                  <h4 className="font-medium">Facility Availability Calendar</h4>
                  <p className="text-sm text-center">
                    The availability calendar for facility bookings will be implemented in an upcoming update.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Coming Soon
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {selectedFacility ? 'Edit Facility' : 'Add New Facility'}
            </DialogTitle>
          </DialogHeader>
          <FacilityForm 
            clubId={clubId} 
            onSuccess={handleFormSuccess} 
            onCancel={() => setIsFormOpen(false)} 
            facility={selectedFacility}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
