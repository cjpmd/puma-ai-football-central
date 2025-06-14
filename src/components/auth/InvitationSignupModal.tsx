
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { userInvitationService } from '@/services/userInvitationService';

interface InvitationSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitationCode: string;
}

export const InvitationSignupModal: React.FC<InvitationSignupModalProps> = ({
  isOpen,
  onClose,
  invitationCode
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<any>(null);
  const [teamName, setTeamName] = useState('');
  const { toast } = useToast();

  console.log('InvitationSignupModal - invitationCode:', invitationCode);
  console.log('InvitationSignupModal - isOpen:', isOpen);

  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!invitationCode) {
        console.log('No invitation code provided');
        return;
      }
      
      console.log('Fetching invitation details for code:', invitationCode);
      try {
        // Simplified query - just get the invitation
        const { data: invitation, error: invitationError } = await supabase
          .from('user_invitations')
          .select('*')
          .eq('invitation_code', invitationCode)
          .eq('status', 'pending')
          .single();

        if (invitationError) {
          console.log('Error fetching invitation:', invitationError);
          toast({
            title: 'Invalid Invitation',
            description: 'The invitation code is invalid or has expired',
            variant: 'destructive',
          });
          return;
        }

        if (!invitation) {
          console.log('No invitation found');
          toast({
            title: 'Invalid Invitation',
            description: 'The invitation code is invalid or has expired',
            variant: 'destructive',
          });
          return;
        }

        console.log('Invitation found:', invitation);
        setInvitationDetails(invitation);
        setName(invitation.name || '');
        setEmail(invitation.email || '');

        // Separately fetch team name if team_id exists
        if (invitation.team_id) {
          const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('name')
            .eq('id', invitation.team_id)
            .single();
          
          if (team && !teamError) {
            setTeamName(team.name);
          }
        }

        console.log('Invitation details set successfully');
      } catch (error) {
        console.error('Error fetching invitation details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load invitation details',
          variant: 'destructive',
        });
      }
    };

    if (isOpen && invitationCode) {
      fetchInvitationDetails();
    }
  }, [invitationCode, isOpen, toast]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Accept the invitation
        await userInvitationService.acceptInvitation(invitationCode, authData.user.id);
        toast({
          title: 'Account Created',
          description: 'Your account has been created and invitation accepted!',
        });
        onClose();
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: 'Signup Failed',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDialogTitle = () => {
    if (teamName) {
      return `Create Account - ${teamName}`;
    }
    return 'Create Account';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            You've been invited to join {teamName || 'Puma AI'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSignup} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="invitation-name">Full Name</Label>
            <Input
              id="invitation-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invitation-email">Email</Label>
            <Input
              id="invitation-email"
              type="email"
              value={email}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invitation-password">Password</Label>
            <Input
              id="invitation-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {invitationDetails && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Invitation Details</CardTitle>
                <CardDescription className="text-xs">
                  Your invitation code: {invitationCode}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
