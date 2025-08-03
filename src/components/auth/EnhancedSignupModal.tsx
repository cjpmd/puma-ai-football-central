
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { userInvitationService } from '@/services/userInvitationService';
import { securityService } from '@/services/securityService';
import { PasswordStrength } from '@/components/ui/password-strength';

interface EnhancedSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInvitationCode?: string;
}

export const EnhancedSignupModal: React.FC<EnhancedSignupModalProps> = ({
  isOpen,
  onClose,
  initialInvitationCode = ''
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [invitationCode, setInvitationCode] = useState(initialInvitationCode);
  const [isLoading, setIsLoading] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<any>(null);
  const [teamName, setTeamName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (invitationCode) {
        try {
          const { data: invitation, error: invitationError } = await supabase
            .from('user_invitations')
            .select('*')
            .eq('invitation_code', invitationCode)
            .eq('status', 'pending')
            .single();

          if (invitationError || !invitation) {
            setInvitationDetails(null);
            setName('');
            setEmail('');
            setTeamName('');
            return;
          }

          let teamNameFromDb = '';
          if (invitation.team_id) {
            const { data: team } = await supabase
              .from('teams')
              .select('name')
              .eq('id', invitation.team_id)
              .single();
            if (team) teamNameFromDb = team.name;
          }

          setInvitationDetails(invitation);
          setName(invitation.name || '');
          setEmail(invitation.email || '');
          setTeamName(teamNameFromDb);
        } catch (error) {
          console.error('Error fetching invitation details:', error);
        }
      } else {
        setInvitationDetails(null);
        setName('');
        setEmail('');
        setTeamName('');
      }
    };

    fetchInvitationDetails();
  }, [invitationCode]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced security validation
    const validationResult = await securityService.validateAuthInput(email, password, 'signup');
    if (!validationResult.isValid) {
      toast({
        title: 'Validation Failed',
        description: validationResult.errors.join(' '),
        variant: 'destructive',
      });
      return;
    }

    if (!email || !password || !name) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!invitationCode) {
      toast({
        title: 'Invitation Code Required',
        description: 'Please enter your invitation code',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Starting signup process for:', email);
      
      // Log security event
      await securityService.logSecurityEvent({
        eventType: 'SIGNUP_ATTEMPT',
        details: { email: email.substring(0, 3) + '***', invitation_code: invitationCode },
        riskLevel: 'low'
      });
      
      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        console.log('Auth user created:', authData.user.id);
        
        // Accept the invitation (marks it as accepted)
        await userInvitationService.acceptInvitation(invitationCode, authData.user.id);
        console.log('Invitation accepted');
        
        // Process the invitation to create profile and associations
        const result = await userInvitationService.processUserInvitation(email);
        console.log('Invitation processing result:', result);
        
        if (result.processed) {
          toast({
            title: 'Account Created Successfully',
            description: 'Your account has been created and you have been added to your team!',
          });
        } else {
          toast({
            title: 'Account Created',
            description: 'Your account has been created. Team associations will be processed shortly.',
          });
        }
        
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
      return `Join ${teamName}`;
    }
    return 'Create Your Account';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {teamName
              ? `You've been invited to join the team. Complete your account setup below.`
              : "Enter your invitation code to begin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSignup} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="invitation-code">Invitation Code</Label>
            <Input
              id="invitation-code"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              placeholder="Enter invitation code"
              required
              disabled={!!initialInvitationCode}
              className={!!initialInvitationCode ? "bg-gray-50" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              disabled={!!invitationDetails}
              className={!!invitationDetails ? "bg-gray-50" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={!!invitationDetails}
              className={!!invitationDetails ? "bg-gray-50" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <PasswordStrength password={password} />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !invitationDetails}
            className="w-full"
          >
            {isLoading ? 'Creating Account...' : 'Create Account & Accept Invitation'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
