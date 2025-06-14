
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { userInvitationService } from '@/services/userInvitationService';
import { Users, UserPlus, Link, Hash } from 'lucide-react';

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
  const [role, setRole] = useState('');
  const [invitationCode, setInvitationCode] = useState(initialInvitationCode);
  const [linkingCode, setLinkingCode] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupMethod, setSignupMethod] = useState<'invitation' | 'linking' | 'open' | 'team_code'>('open');
  const [invitationDetails, setInvitationDetails] = useState<any>(null);
  const [teamName, setTeamName] = useState('');
  const { toast } = useToast();

  // Check for invitation details when invitation code is provided
  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (initialInvitationCode) {
        try {
          const { data, error } = await supabase
            .from('user_invitations')
            .select(`
              *,
              teams!inner(name)
            `)
            .eq('invitation_code', initialInvitationCode)
            .eq('status', 'pending')
            .single();

          if (data && !error) {
            setInvitationDetails(data);
            setName(data.name || '');
            setEmail(data.email || '');
            setTeamName((data as any).teams?.name || '');
            setInvitationCode(initialInvitationCode);
            setSignupMethod('invitation');
          }
        } catch (error) {
          console.error('Error fetching invitation details:', error);
        }
      }
    };

    fetchInvitationDetails();
  }, [initialInvitationCode]);

  const handleSignup = async () => {
    if (!email || !password || !name) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (signupMethod === 'open' && !role) {
      toast({
        title: 'Role Required',
        description: 'Please select your role',
        variant: 'destructive',
      });
      return;
    }

    if (signupMethod === 'invitation' && !invitationCode) {
      toast({
        title: 'Invitation Code Required',
        description: 'Please enter your invitation code',
        variant: 'destructive',
      });
      return;
    }

    if (signupMethod === 'linking' && !linkingCode) {
      toast({
        title: 'Linking Code Required',
        description: 'Please enter your linking code',
        variant: 'destructive',
      });
      return;
    }

    if (signupMethod === 'team_code' && !teamCode) {
      toast({
        title: 'Team Code Required',
        description: 'Please enter your team code',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Validate team code before creating account
      if (signupMethod === 'team_code') {
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', teamCode)
          .single();

        if (teamError || !team) {
          toast({
            title: 'Invalid Team Code',
            description: 'The team code you entered is not valid',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
      }

      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: signupMethod === 'open' ? role : undefined
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Handle different signup methods
        if (signupMethod === 'invitation' && invitationCode) {
          await userInvitationService.acceptInvitation(invitationCode, authData.user.id);
          toast({
            title: 'Account Created',
            description: 'Your account has been created and invitation accepted!',
          });
        } else if (signupMethod === 'linking' && linkingCode) {
          // Try to link as player first, then staff
          try {
            await userInvitationService.linkPlayerAccount(linkingCode, authData.user.id);
            toast({
              title: 'Account Linked',
              description: 'Your account has been created and linked to your player profile!',
            });
          } catch (playerError) {
            try {
              await userInvitationService.linkStaffAccount(linkingCode, authData.user.id);
              toast({
                title: 'Account Linked',
                description: 'Your account has been created and linked to your staff profile!',
              });
            } catch (staffError) {
              toast({
                title: 'Invalid Linking Code',
                description: 'The linking code you entered is not valid',
                variant: 'destructive',
              });
              return;
            }
          }
        } else if (signupMethod === 'team_code') {
          // Add user to team with default parent role
          await supabase
            .from('user_teams')
            .insert({
              user_id: authData.user.id,
              team_id: teamCode,
              role: 'parent'
            });

          // Update user profile with parent role
          const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('id', authData.user.id)
            .single();

          const currentRoles = profile?.roles || [];
          if (!currentRoles.includes('parent')) {
            await supabase
              .from('profiles')
              .update({ roles: [...currentRoles, 'parent'] })
              .eq('id', authData.user.id);
          }

          toast({
            title: 'Account Created',
            description: 'Your account has been created and linked to your team!',
          });
        } else {
          toast({
            title: 'Account Created',
            description: 'Your account has been created successfully!',
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
      return `Create Account - ${teamName}`;
    }
    return 'Create Account';
  };

  // If we have an invitation code and invitation details, show simplified invitation-only form
  if (initialInvitationCode && invitationDetails) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              You've been invited to join {teamName || 'Puma AI'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-gray-50"
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Invitation Details</CardTitle>
                <CardDescription className="text-xs">
                  Your invitation code: {invitationCode}
                </CardDescription>
              </CardHeader>
            </Card>

            <Button
              onClick={handleSignup}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show full tabbed interface for non-invitation signups
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            Choose how you'd like to create your account
          </DialogDescription>
        </DialogHeader>

        <Tabs value={signupMethod} onValueChange={(value) => setSignupMethod(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="invitation" className="text-xs">
              <UserPlus className="h-3 w-3 mr-1" />
              Invite
            </TabsTrigger>
            <TabsTrigger value="team_code" className="text-xs">
              <Hash className="h-3 w-3 mr-1" />
              Team
            </TabsTrigger>
            <TabsTrigger value="linking" className="text-xs">
              <Link className="h-3 w-3 mr-1" />
              Link
            </TabsTrigger>
            <TabsTrigger value="open" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Open
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 mt-4">
            {/* Common fields for all signup methods */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={signupMethod === 'invitation' && !!invitationDetails}
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
                disabled={signupMethod === 'invitation' && !!invitationDetails}
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

            {/* Tab-specific content */}
            <TabsContent value="invitation" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Invitation Code</CardTitle>
                  <CardDescription className="text-xs">
                    Enter the invitation code you received
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    placeholder="Enter invitation code"
                    required
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team_code" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Team Code</CardTitle>
                  <CardDescription className="text-xs">
                    Enter your team's unique code to join
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    placeholder="Enter team code"
                    required
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="linking" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Linking Code</CardTitle>
                  <CardDescription className="text-xs">
                    Enter your player or staff linking code
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    value={linkingCode}
                    onChange={(e) => setLinkingCode(e.target.value)}
                    placeholder="Enter linking code"
                    required
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="open" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Select Your Role</CardTitle>
                  <CardDescription className="text-xs">
                    Choose the role that best describes you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff Member</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="player">Player</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </TabsContent>

            <Button
              onClick={handleSignup}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
