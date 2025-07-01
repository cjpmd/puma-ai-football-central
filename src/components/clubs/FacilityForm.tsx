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
  const [formData, setFormData] = useState({
    name: facility?.name || '',
    description: facility?.description || '',
    bookable_units: facility?.bookable_units || 'hours'
  });

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
            name: formData.name,
            description: formData.description,
            bookable_units: formData.bookable_units,
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
            name: formData.name,
            description: formData.description,
            bookable_units: formData.bookable_units
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Facility Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g. Main Field"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the facility..."
          className="min-h-[100px]"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bookable_units">Bookable Units</Label>
        <Select
          value={formData.bookable_units}
          onValueChange={(value) => setFormData(prev => ({ ...prev, bookable_units: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select booking type" />
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
