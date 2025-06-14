
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { userInvitationService } from '@/services/userInvitationService';
import { UserPlus } from 'lucide-react';

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
  const [invitationError, setInvitationError] = useState<string>('');
  const { toast } = useToast();

  console.log('EnhancedSignupModal rendered with:', { 
    isOpen, 
    initialInvitationCode, 
    invitationCode,
    email,
    name,
    invitationError
  });

  // Initialize invitation code
  useEffect(() => {
    console.log('Effect - initialInvitationCode changed:', initialInvitationCode);
    if (initialInvitationCode) {
      console.log('Setting invitation code from initial value');
      setInvitationCode(initialInvitationCode);
      setInvitationError('');
    } else {
      // Reset form when no invitation code
      setInvitationCode('');
      setInvitationDetails(null);
      setEmail('');
      setName('');
      setTeamName('');
      setInvitationError('');
    }
  }, [initialInvitationCode]);

  // Fetch invitation details when we have an invitation code
  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!invitationCode) {
        console.log('No invitation code, clearing details');
        setInvitationDetails(null);
        setInvitationError('');
        return;
      }

      console.log('Fetching invitation details for code:', invitationCode);
      setInvitationError('');
      
      try {
        // Check if invitation exists regardless of status
        const { data: anyInvitation, error: anyError } = await supabase
          .from('user_invitations')
          .select(`
            *,
            teams!inner(name)
          `)
          .eq('invitation_code', invitationCode)
          .single();

        console.log('Invitation found:', anyInvitation, 'Error:', anyError);

        if (anyError && anyError.code === 'PGRST116') {
          // No invitation found at all
          setInvitationError('Invalid invitation code - no invitation found');
          setInvitationDetails(null);
          return;
        }

        if (anyInvitation) {
          console.log('Invitation found with status:', anyInvitation.status);
          
          if (anyInvitation.status === 'accepted') {
            setInvitationError('This invitation has already been accepted');
            setInvitationDetails(null);
            return;
          }
          
          if (anyInvitation.status === 'expired') {
            setInvitationError('This invitation has expired');
            setInvitationDetails(null);
            return;
          }

          if (new Date(anyInvitation.expires_at) < new Date()) {
            setInvitationError('This invitation has expired');
            setInvitationDetails(null);
            return;
          }

          if (anyInvitation.status === 'pending') {
            console.log('Valid pending invitation found:', anyInvitation);
            setInvitationDetails(anyInvitation);
            setName(anyInvitation.name || '');
            setEmail(anyInvitation.email || '');
            setTeamName((anyInvitation as any).teams?.name || '');
            setInvitationError('');
          } else {
            setInvitationError(`Invitation status is ${anyInvitation.status}`);
            setInvitationDetails(null);
          }
        }
      } catch (error) {
        console.error('Error fetching invitation details:', error);
        setInvitationError('Error loading invitation details');
        setInvitationDetails(null);
      }
    };

    fetchInvitationDetails();
  }, [invitationCode]);

  const handleSignup = async () => {
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

    if (invitationError) {
      toast({
        title: 'Invalid Invitation',
        description: 'Please resolve the invitation issue before proceeding',
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
      return `Join ${teamName}`;
    }
    return 'Join Team';
  };

  // Check if we should disable fields for invitation signup
  const isInvitationWithDetails = invitationDetails && !invitationError;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            Create your account using your invitation code
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Show invitation error if any */}
          {invitationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{invitationError}</p>
            </div>
          )}

          {/* Show team info if invitation is valid */}
          {isInvitationWithDetails && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                You're invited to join <strong>{teamName}</strong> as a <strong>{invitationDetails.role}</strong>
              </p>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Invitation Code</CardTitle>
              <CardDescription className="text-xs">
                {isInvitationWithDetails ? 'Your invitation details have been loaded' : 'Enter the invitation code you received'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                placeholder="Enter invitation code"
                required
                disabled={!!isInvitationWithDetails}
              />
            </CardContent>
          </Card>

          {/* Account creation fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={isInvitationWithDetails}
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
                disabled={isInvitationWithDetails}
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
            </div>
          </div>

          <Button
            onClick={handleSignup}
            disabled={isLoading || !!invitationError}
            className="w-full"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>

          {!invitationCode && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Don't have an invitation code?</p>
              <p>Contact your team administrator to get invited.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
