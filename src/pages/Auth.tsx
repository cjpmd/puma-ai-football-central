
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { UserLoginModal } from '@/components/modals/UserLoginModal';
import { EnhancedSignupModal } from '@/components/auth/EnhancedSignupModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Auth = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get invitation code from URL
  const invitationCode = searchParams.get('invitation') || '';

  console.log('Auth page - invitation code from URL:', invitationCode);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };

    checkAuth();

    // If there's an invitation code, automatically open the signup modal
    if (invitationCode) {
      console.log('Opening signup modal with invitation code:', invitationCode);
      setIsSignupModalOpen(true);
    }
  }, [navigate, invitationCode]);

  const handleLoginClose = () => {
    setIsLoginModalOpen(false);
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    navigate('/');
  };

  const handleSignupClose = () => {
    setIsSignupModalOpen(false);
    // If we came here via invitation, go back to home when closing
    if (invitationCode) {
      navigate('/');
    }
  };

  const handleSignupSuccess = () => {
    setIsSignupModalOpen(false);
    navigate('/');
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">
                {invitationCode ? 'Accept Your Invitation' : 'Welcome to Puma AI'}
              </CardTitle>
              <CardDescription>
                {invitationCode 
                  ? 'Create your account to join your team'
                  : 'Sign in to your account or join with an invitation'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!invitationCode && (
                <Button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full"
                  variant="default"
                >
                  Sign In
                </Button>
              )}
              <Button
                onClick={() => setIsSignupModalOpen(true)}
                className="w-full"
                variant={invitationCode ? "default" : "outline"}
              >
                {invitationCode ? 'Accept Invitation' : 'Join with Invitation Code'}
              </Button>
              
              {!invitationCode && (
                <div className="text-center text-sm text-muted-foreground mt-4">
                  <p>New to Puma AI?</p>
                  <p>Ask your team administrator for an invitation code to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <UserLoginModal
        isOpen={isLoginModalOpen}
        onClose={handleLoginClose}
        onLogin={handleLoginSuccess}
      />

      <EnhancedSignupModal
        isOpen={isSignupModalOpen}
        onClose={handleSignupClose}
        onSignup={handleSignupSuccess}
        initialInvitationCode={invitationCode}
      />
    </MainLayout>
  );
};

export default Auth;
