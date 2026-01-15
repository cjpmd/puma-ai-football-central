import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Mail, Lock, ChevronRight, Users, UserPlus, Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { UnifiedSignupWizard } from '@/components/auth/UnifiedSignupWizard';
import { TeamSetupWizard } from '@/components/auth/TeamSetupWizard';
import { ClubSetupWizard } from '@/components/auth/ClubSetupWizard';

type View = 'options' | 'login';

export default function AuthMobile() {
  const [view, setView] = useState<View>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  // Wizard states
  const [showJoinTeamWizard, setShowJoinTeamWizard] = useState(false);
  const [showTeamSetupWizard, setShowTeamSetupWizard] = useState(false);
  const [showClubSetupWizard, setShowClubSetupWizard] = useState(false);
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Successfully signed in!',
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWizardSuccess = () => {
    navigate('/dashboard');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: 'Check your email',
        description: 'We\'ve sent you a password reset link.',
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email',
        variant: 'destructive',
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  // Options View - Spond-style entry screen
  if (view === 'options') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top Header with Logo */}
        <div className="pt-safe px-6 py-8 text-center">
          <div className="flex justify-center mb-3">
            <img 
              src="/lovable-uploads/0b482bd3-18fb-49dd-8a03-f68969572c7e.png" 
              alt="Puma AI" 
              className="w-20 h-20"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Puma AI</h1>
          <p className="text-muted-foreground">Team Management Made Simple</p>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col px-6 pb-safe">

          {/* Option Cards */}
          <div className="w-full space-y-3">
            {/* Join Existing Team */}
            <button
              onClick={() => setShowJoinTeamWizard(true)}
              className="w-full p-4 bg-card border border-border rounded-xl text-left flex items-center justify-between hover:bg-muted/50 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Join an Existing Team</h3>
                  <p className="text-sm text-muted-foreground">
                    I have a team code to join
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>

            {/* Set Up New Team */}
            <button
              onClick={() => setShowTeamSetupWizard(true)}
              className="w-full p-4 bg-card border border-border rounded-xl text-left flex items-center justify-between hover:bg-muted/50 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Set Up A New Team</h3>
                  <p className="text-sm text-muted-foreground">
                    I want to create and manage my own team
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>

            {/* Set Up New Club */}
            <button
              onClick={() => setShowClubSetupWizard(true)}
              className="w-full p-4 bg-card border border-border rounded-xl text-left flex items-center justify-between hover:bg-muted/50 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Set Up A New Club</h3>
                  <p className="text-sm text-muted-foreground">
                    I want to create a club with multiple teams
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>
          </div>

          {/* Sign In Link */}
          <div className="mt-auto pt-8 pb-4 text-center">
            <p className="text-muted-foreground">Already have an account?</p>
            <Button 
              variant="link" 
              onClick={() => setView('login')}
              className="text-primary font-medium"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Wizards */}
        <UnifiedSignupWizard
          isOpen={showJoinTeamWizard}
          onClose={() => setShowJoinTeamWizard(false)}
          onSuccess={handleWizardSuccess}
          onSwitchToLogin={() => {
            setShowJoinTeamWizard(false);
            setView('login');
          }}
        />
        
        <TeamSetupWizard
          isOpen={showTeamSetupWizard}
          onClose={() => setShowTeamSetupWizard(false)}
          onSuccess={handleWizardSuccess}
        />
        
        <ClubSetupWizard
          isOpen={showClubSetupWizard}
          onClose={() => setShowClubSetupWizard(false)}
          onSuccess={handleWizardSuccess}
        />
      </div>
    );
  }

  // Login View
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setView('options')}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img 
              src="/lovable-uploads/0b482bd3-18fb-49dd-8a03-f68969572c7e.png" 
              alt="Puma AI" 
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10 h-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button 
                variant="link" 
                className="text-sm text-muted-foreground"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot your password?
              </Button>
            </div>

            {/* Forgot Password Sheet */}
            <Sheet open={showForgotPassword} onOpenChange={setShowForgotPassword}>
              <SheetContent side="bottom" className="h-auto rounded-t-xl">
                <SheetHeader className="text-left">
                  <SheetTitle>Reset Password</SheetTitle>
                  <SheetDescription>
                    Enter your email and we'll send you a reset link.
                  </SheetDescription>
                </SheetHeader>
                <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pb-safe">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1 h-12"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={forgotPasswordLoading}
                      className="flex-1 h-12"
                    >
                      {forgotPasswordLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Link'
                      )}
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-muted-foreground">Don't have an account?</p>
          <Button 
            variant="link" 
            onClick={() => setView('options')}
            className="text-primary font-medium"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
