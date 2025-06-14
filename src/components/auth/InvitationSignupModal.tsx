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
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<any>(null);
  const [teamName, setTeamName] = useState('');
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!invitationCode || !isOpen) return;

      setIsValidating(true);
      setErrorState(null);
      console.log('InvitationSignupModal: Fetching invitation details for code:', invitationCode);
      
      try {
        // Step 1: Fetch the invitation details
        const { data: invitation, error: invitationError } = await supabase
          .from('user_invitations')
          .select('id, name, email, team_id')
          .eq('invitation_code', invitationCode)
          .eq('status', 'pending')
          .maybeSingle();

        if (invitationError) {
          throw invitationError;
        }

        if (!invitation) {
          setErrorState('This invitation may be expired, used, or invalid.');
          return;
        }

        console.log('Invitation data found:', invitation);
        setInvitationDetails(invitation);
        setName(invitation.name || '');
        setEmail(invitation.email || '');

        // Step 2: If a team_id exists, fetch the team name
        if (invitation.team_id) {
          console.log('Fetching team name for team_id:', invitation.team_id);
          const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('name')
            .eq('id', invitation.team_id)
            .maybeSingle();
          
          if (teamError) {
            console.error('Error fetching team name:', teamError);
            // Non-critical error, we can proceed without the team name
          } else if (team) {
            console.log('Team name found:', team.name);
            setTeamName(team.name);
          }
        }
      } catch (error: any) {
        console.error('Unexpected error in fetchInvitationDetails:', error);
        setErrorState('An unexpected error occurred while validating your invitation.');
      } finally {
        setIsValidating(false);
      }
    };

    fetchInvitationDetails();
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

    setIsSigningUp(true);

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
      setIsSigningUp(false);
    }
  };

  const getDialogTitle = () => {
    if (teamName) {
      return `Create Account - ${teamName}`;
    }
    return 'Create Account';
  };
  
  if (isValidating) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Validating Invitation...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center p-8">
            <p>Please wait while we check your invitation code.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (errorState) {
    return (
     <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle>Invitation Error</DialogTitle>
         </DialogHeader>
         <div className="flex flex-col items-center justify-center p-8 space-y-4">
           <p className="text-center text-destructive">{errorState}</p>
           <Button onClick={onClose} variant="outline">Close</Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 }

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
            disabled={isSigningUp}
            className="w-full"
          >
            {isSigningUp ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
