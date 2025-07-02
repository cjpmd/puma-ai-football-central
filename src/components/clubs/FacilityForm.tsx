
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Facility } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface FacilityFormProps {
  clubId: string;
  onSuccess: () => void;
  onCancel: () => void;
  facility?: Facility;
}

export const FacilityForm = ({ clubId, onSuccess, onCancel, facility }: FacilityFormProps) => {
  const [name, setName] = useState(facility?.name || '');
  const [description, setDescription] = useState(facility?.description || '');
  const [bookableUnits, setBookableUnits] = useState(facility?.bookableUnits || 'hours');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (facility) {
        // Update existing facility
        const { error } = await supabase
          .from('facilities')
          .update({
            name,
            description,
            bookable_units: bookableUnits,
            updated_at: new Date().toISOString()
          })
          .eq('id', facility.id);

        if (error) throw error;
        toast.success('Facility updated successfully');
      } else {
        // Create new facility
        const { error } = await supabase
          .from('facilities')
          .insert({
            club_id: clubId,
            name,
            description,
            bookable_units: bookableUnits
          });

        if (error) throw error;
        toast.success('Facility created successfully');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error managing facility:', error);
      toast.error(error.message || 'Failed to manage facility');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="name">Facility Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Main Field"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the facility..."
          className="min-h-[100px]"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bookableUnits">Bookable Units</Label>
        <Select
          value={bookableUnits}
          onValueChange={setBookableUnits}
          disabled={isSubmitting}
        >
          <SelectTrigger id="bookableUnits">
            <SelectValue placeholder="Select booking unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hours">Hours</SelectItem>
            <SelectItem value="sessions">Sessions</SelectItem>
            <SelectItem value="days">Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-puma-blue-500 hover:bg-puma-blue-600"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Saving...'
            : facility
              ? 'Update Facility'
              : 'Add Facility'
          }
        </Button>
      </div>
    </form>
  );
};
