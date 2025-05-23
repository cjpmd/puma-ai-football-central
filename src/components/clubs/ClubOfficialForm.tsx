
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ClubOfficial } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface ClubOfficialFormProps {
  clubId: string;
  onSuccess: () => void;
  onCancel: () => void;
  official?: ClubOfficial;
}

export const ClubOfficialForm = ({ clubId, onSuccess, onCancel, official }: ClubOfficialFormProps) => {
  const [email, setEmail] = useState(official?.profile?.email || '');
  const [role, setRole] = useState<string>(official?.role || 'admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // If editing an existing official
      if (official) {
        const { error } = await supabase
          .from('club_officials')
          .update({
            role: role,
            updated_at: new Date().toISOString()
          })
          .eq('id', official.id);

        if (error) throw error;
        toast.success('Club official updated successfully');
        onSuccess();
        return;
      }

      // For a new official, first check if the user exists
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        toast.error('User not found with this email address');
        setIsSubmitting(false);
        return;
      }

      // Then insert the new club official
      const { error } = await supabase
        .from('club_officials')
        .insert({
          club_id: clubId,
          user_id: userData.id,
          role: role,
          assigned_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        // Check for duplicate record error
        if (error.code === '23505') {
          toast.error('This user is already an official for this club');
          return;
        }
        throw error;
      }

      toast.success('Club official added successfully');
      onSuccess();

    } catch (error: any) {
      console.error('Error managing club official:', error);
      toast.error(error.message || 'Failed to manage club official');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {!official && (
        <div className="space-y-2">
          <Label htmlFor="email">User Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required={!official}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            The user must already have an account in the system.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={role}
          onValueChange={setRole}
          disabled={isSubmitting}
        >
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Club Admin</SelectItem>
            <SelectItem value="chair">Club Chair</SelectItem>
            <SelectItem value="secretary">Club Secretary</SelectItem>
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
            : official
              ? 'Update Official'
              : 'Add Official'
          }
        </Button>
      </div>
    </form>
  );
};
