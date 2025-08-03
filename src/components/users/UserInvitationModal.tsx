
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { userInvitationService, InviteUserData } from '@/services/userInvitationService';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText, validateEmail, validateName } from '@/utils/inputValidation';
import { toast } from 'sonner';

interface ValidationResult {
  is_valid: boolean;
  errors: string[];
}

interface UserInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
  prefilledData?: {
    teamId?: string;
    playerId?: string;
    staffId?: string;
  };
}

export const UserInvitationModal: React.FC<UserInvitationModalProps> = ({
  isOpen,
  onClose,
  onInviteSent,
  prefilledData
}) => {
  const { teams } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'player' as 'staff' | 'parent' | 'player',
    teamId: prefilledData?.teamId || teams[0]?.id || '',
    subscriptionType: 'full_squad' as 'full_squad' | 'training' | 'trialist'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Client-side validation
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        toast.error(emailValidation.error);
        return;
      }

      const nameValidation = validateName(formData.name);
      if (!nameValidation.isValid) {
        toast.error(nameValidation.error);
        return;
      }

      // Sanitize inputs
      const sanitizedName = sanitizeText(formData.name);
      const sanitizedEmail = formData.email.trim().toLowerCase();

      // Get team name for validation
      const selectedTeam = teams.find(t => t.id === formData.teamId);
      const teamName = selectedTeam?.name || '';

      // Server-side validation using secure function
      const { data: validationResult, error: validationError } = await supabase
        .rpc('validate_invitation_data', {
          p_email: sanitizedEmail,
          p_team_name: teamName,
          p_user_name: sanitizedName,
          p_role: formData.role
        });

      if (validationError) {
        console.error('Validation error:', validationError);
        toast.error('Validation failed. Please try again.');
        return;
      }

      const validation = validationResult as unknown as ValidationResult;
      if (!validation?.is_valid) {
        const errors = validation?.errors || ['Validation failed'];
        toast.error(errors[0]);
        return;
      }

      const inviteData: InviteUserData = {
        email: sanitizedEmail,
        name: sanitizedName,
        role: formData.role,
        teamId: formData.teamId || undefined,
        playerId: prefilledData?.playerId,
        staffId: prefilledData?.staffId
      };

      await userInvitationService.inviteUser(inviteData);
      toast.success('Invitation sent successfully!');
      onInviteSent();
      onClose();
      setFormData({
        email: '',
        name: '',
        role: 'player',
        teamId: prefilledData?.teamId || teams[0]?.id || '',
        subscriptionType: 'full_squad'
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {prefilledData?.playerId ? 'Invite Player or Parent' : 'Invite User'}
          </DialogTitle>
        </DialogHeader>
        
        {prefilledData?.playerId && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Invite the player themselves or their parent to complete the player setup and subscription.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Email address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {prefilledData?.playerId ? (
                  <>
                    <SelectItem value="player">Player (Self)</SelectItem>
                    <SelectItem value="parent">Parent/Guardian</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {prefilledData?.playerId && (
            <div className="space-y-2">
              <Label htmlFor="subscriptionType">Required Subscription Type</Label>
              <Select
                value={formData.subscriptionType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subscriptionType: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_squad">Full Squad</SelectItem>
                  <SelectItem value="training">Training Only</SelectItem>
                  <SelectItem value="trialist">Trialist (Free)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.subscriptionType === 'trialist' 
                  ? 'Free trial period - no payment required during setup.'
                  : 'The invited person will need to set up this subscription type.'
                }
              </p>
            </div>
          )}

          {teams.length > 0 && !prefilledData?.teamId && (
            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Select
                value={formData.teamId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, teamId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
