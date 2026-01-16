import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ClubStaffInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
  onInviteSent: () => void;
}

const CLUB_ROLES = [
  { value: 'club_admin', label: 'Club Admin', description: 'Full access to all club features' },
  { value: 'club_chair', label: 'Club Chair', description: 'Leadership role with overview access' },
  { value: 'club_secretary', label: 'Club Secretary', description: 'Administrative access' },
];

export function ClubStaffInviteModal({
  isOpen,
  onClose,
  clubId,
  clubName,
  onInviteSent
}: ClubStaffInviteModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('club_admin');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    if (!name.trim()) {
      toast({ title: 'Error', description: 'Please enter a name', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (existingProfile) {
        // User exists - add them directly to user_clubs
        const { error: linkError } = await supabase
          .from('user_clubs')
          .insert({
            user_id: existingProfile.id,
            club_id: clubId,
            role: role
          });

        if (linkError) {
          if (linkError.code === '23505') {
            toast({ title: 'Already Added', description: 'This user is already a club staff member', variant: 'destructive' });
          } else {
            throw linkError;
          }
          return;
        }

        toast({ title: 'Staff Added', description: `${name} has been added as ${role.replace('_', ' ')}` });
      } else {
        // User doesn't exist - create invitation
        const code = crypto.randomUUID().slice(0, 8).toUpperCase();
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error: inviteError } = await supabase
          .from('user_invitations')
          .insert({
            email: email.toLowerCase().trim(),
            name: name.trim(),
            role: role,
            club_id: clubId,
            invitation_code: code,
            status: 'pending',
            invited_by: user?.id || '',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });

        if (inviteError) throw inviteError;

        // Send invitation email
        await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: email.toLowerCase().trim(),
            name: name.trim(),
            invitationCode: code,
            clubName: clubName,
            role: role
          }
        });

        toast({ title: 'Invitation Sent', description: `An invitation has been sent to ${email}` });
      }

      setEmail('');
      setName('');
      setRole('club_admin');
      onInviteSent();
      onClose();
    } catch (error: any) {
      console.error('Error inviting staff:', error);
      toast({ title: 'Error', description: error.message || 'Failed to send invitation', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Club Staff</DialogTitle>
          <DialogDescription>
            Add a new staff member to {clubName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Club Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {CLUB_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div>
                      <div className="font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleInvite} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Staff'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
