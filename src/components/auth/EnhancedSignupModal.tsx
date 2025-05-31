
import { useState } from 'react';
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
import { Users, UserPlus, Link } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [signupMethod, setSignupMethod] = useState<'invitation' | 'linking' | 'open'>('open');
  const { toast } = useToast();

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

    setIsLoading(true);

    try {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>
            Choose how you'd like to create your account
          </DialogDescription>
        </DialogHeader>

        <Tabs value={signupMethod} onValueChange={(value) => setSignupMethod(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="open" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Open
            </TabsTrigger>
            <TabsTrigger value="invitation" className="text-xs">
              <UserPlus className="h-3 w-3 mr-1" />
              Invite
            </TabsTrigger>
            <TabsTrigger value="linking" className="text-xs">
              <Link className="h-3 w-3 mr-1" />
              Link
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
