
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
import { LogIn, UserPlus } from 'lucide-react';

const Auth = () => {
  console.log(`[Auth.tsx] Component is EXECUTING. Timestamp: ${new Date().toISOString()}`);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEnhancedSignup, setShowEnhancedSignup] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Use the useSearchParams hook for a more reliable way to get URL parameters
  const [searchParams] = useSearchParams();
  const invitationCode = searchParams.get('invitation');

  console.log(`[Auth.tsx] Full URL: ${window.location.href}`);
  console.log(`[Auth.tsx] Search params from hook: ${searchParams.toString()}`);
  console.log(`[Auth.tsx] Parsed invitation code: '${invitationCode}'`);

  useEffect(() => {
    console.log('[Auth.tsx] useEffect triggered. Dependencies:', { user: !!user, loading, invitationCode });
    // Wait for auth loading to finish before redirecting
    if (!loading && user && !invitationCode) {
      console.log('[Auth.tsx] User is logged in and no invitation code, redirecting to /dashboard');
      navigate('/dashboard');
    }
  }, [user, loading, navigate, invitationCode]);

  // If there's an invitation code, render the modal directly.
  if (invitationCode) {
    console.log('[Auth.tsx] INVITATION CODE DETECTED. Rendering EnhancedSignupModal.');
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

  console.log('[Auth.tsx] No invitation code. Proceeding to render login/signup tabs.');

  // Avoid rendering login form while auth state is loading or if user is logged in
  if (loading || user) {
    console.log(`[Auth.tsx] Auth is loading (${loading}) or user exists (${!!user}). Rendering null.`);
    return null; // Or a loading spinner
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
    console.log('[Auth.tsx] Starting login process.');

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
      
      console.log('[Auth.tsx] Login successful, redirecting to /dashboard.');
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

  console.log('[Auth.tsx] Rendering standard login/signup UI.');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or create a new one
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
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Account creation is by invitation only.
                </p>
                <Button
                  onClick={() => setShowEnhancedSignup(true)}
                  className="w-full"
                  variant="default"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Have an invitation code?
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <EnhancedSignupModal
        isOpen={showEnhancedSignup}
        onClose={() => setShowEnhancedSignup(false)}
      />
    </div>
  );
};

export default Auth;
