import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedSignupModal } from '@/components/auth/EnhancedSignupModal';
import { UnifiedSignupWizard } from '@/components/auth/UnifiedSignupWizard';
import { LogIn, UserPlus, Users } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEnhancedSignup, setShowEnhancedSignup] = useState(false);
  const [showUnifiedSignup, setShowUnifiedSignup] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [searchParams] = useSearchParams();
  const invitationCode = searchParams.get('invitation');

  useEffect(() => {
    if (!loading && user && !invitationCode) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate, invitationCode]);

  // If there's an invitation code, render the modal directly.
  if (invitationCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <EnhancedSignupModal
          isOpen={true}
          onClose={() => navigate('/auth', { replace: true })}
          initialInvitationCode={invitationCode}
        />
      </div>
    );
  }

  if (loading || user) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both email and password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or join a team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </TabsTrigger>
              <TabsTrigger value="signup">
                <UserPlus className="h-4 w-4 mr-2" />
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Choose how you'd like to join
                </p>
                
                {/* Primary option: Team Code */}
                <Button
                  onClick={() => setShowUnifiedSignup(true)}
                  className="w-full"
                  variant="default"
                  size="lg"
                >
                  <Users className="h-4 w-4 mr-2" />
                  I have a Team Code
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Get the team code from your team manager to join as a player, parent, or staff
                </p>
                
                {/* Secondary option: Invitation code (legacy) */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>
                
                <Button
                  onClick={() => setShowEnhancedSignup(true)}
                  className="w-full"
                  variant="outline"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  I have an Invitation Code
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Unified Team Code Signup Wizard */}
      <UnifiedSignupWizard
        isOpen={showUnifiedSignup}
        onClose={() => setShowUnifiedSignup(false)}
        onSuccess={() => {
          setShowUnifiedSignup(false);
          navigate('/dashboard');
        }}
        onSwitchToLogin={() => {
          setShowUnifiedSignup(false);
        }}
      />

      {/* Legacy Invitation Code Signup */}
      <EnhancedSignupModal
        isOpen={showEnhancedSignup}
        onClose={() => setShowEnhancedSignup(false)}
      />
    </div>
  );
};

export default Auth;
