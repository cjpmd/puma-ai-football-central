import { Button } from "@/components/ui/button";
import { useState } from "react";
import { UserSignupModal } from "../modals/UserSignupModal";
import { UserLoginModal } from "../modals/UserLoginModal";
import { useNavigate } from "react-router-dom";

export function Hero() {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();

  const handleSignup = () => {
    setShowSignupModal(false);
    navigate("/dashboard");
  };

  const handleLogin = () => {
    setShowLoginModal(false);
    navigate("/dashboard");
  };

  const switchToLogin = () => {
    setShowSignupModal(false);
    setShowLoginModal(true);
  };

  const switchToSignup = () => {
    setShowLoginModal(false);
    setShowSignupModal(true);
  };

  return (
    <div className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-br from-puma-blue-50 to-transparent" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <div className="pt-8 pb-4 text-center">
          <img 
            src="/lovable-uploads/52998c71-592a-493d-bab1-7a1a5726080e.png" 
            alt="Puma-AI Logo" 
            className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 mx-auto mb-4"
          />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-gray-900">
            <span className="block">Welcome to</span>
            <span className="block text-puma-blue-500">Puma-AI</span>
          </h1>
        </div>

        <div className="pb-16 text-center lg:pb-24">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-6">
            <span className="block">Elevate your</span>
            <span className="block text-puma-blue-500">football management</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-gray-600 px-4">
            Puma-AI is the comprehensive platform for managing football teams and clubs. 
            Track player development, organize fixtures, and analyze performance—all in one place.
          </p>
          <div className="mx-auto mt-10 max-w-xl px-4">
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                onClick={() => setShowSignupModal(true)}
                className="h-12 px-8 bg-puma-blue-500 hover:bg-puma-blue-600 text-base w-full sm:w-auto"
              >
                Get started
              </Button>
              <Button 
                onClick={() => setShowLoginModal(true)}
                variant="outline" 
                className="h-12 px-8 text-base border-puma-blue-500 text-puma-blue-500 hover:bg-puma-blue-50 w-full sm:w-auto"
              >
                Sign in
              </Button>
            </div>
          </div>
          <div className="mt-16 lg:mt-20">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Trusted by clubs and teams across the country
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-8 opacity-70">
              <div className="h-6 sm:h-8 w-auto">
                <svg viewBox="0 0 180 30" fill="currentColor" className="h-6 sm:h-8 w-auto text-gray-900">
                  <path d="M22.5 15L12.5 8v14l10-7zm-15 0L17.5 4v22l-10-11z" />
                  <path d="M42.5 8h-6v14h2v-6h4c2.2 0 4-1.8 4-4s-1.8-4-4-4zm0 6h-4v-4h4c1.1 0 2 .9 2 2s-.9 2-2 2z" />
                  <path d="M56.5 8l-4 14h2l1-3.5h5l1 3.5h2l-4-14h-3zm-.5 8.5l2-7 2 7h-4z" />
                  <path d="M72.5 8h-6v14h2v-6h4c2.2 0 4-1.8 4-4s-1.8-4-4-4zm0 6h-4v-4h4c1.1 0 2 .9 2 2s-.9 2-2 2z" />
                  <path d="M84.5 8h-4v14h4c3.9 0 7-3.1 7-7s-3.1-7-7-7zm0 12h-2v-10h2c2.8 0 5 2.2 5 5s-2.2 5-5 5z" />
                  <path d="M99.5 20h8v2h-8z" />
                  <path d="M120.5 8h-6v14h6c3.9 0 7-3.1 7-7s-3.1-7-7-7zm0 12h-4v-10h4c2.8 0 5 2.2 5 5s-2.2 5-5 5z" />
                  <path d="M135.5 8h-2v14h2z" />
                  <path d="M146.5 8h-4v14h2v-4h2c3.3 0 6-2.7 6-6 0-2.2-1.8-4-4-4zm0 8h-2v-6h2c1.7 0 3 1.3 3 3s-1.3 3-3 3z" />
                  <path d="M159.5 15c0 3.9 3.1 7 7 7s7-3.1 7-7-3.1-7-7-7-7 3.1-7 7zm12 0c0 2.8-2.2 5-5 5s-5-2.2-5-5 2.2-5 5-5 5 2.2 5 5z" />
                </svg>
              </div>
              <div className="h-6 sm:h-8 w-auto">
                <svg viewBox="0 0 180 30" fill="currentColor" className="h-6 sm:h-8 w-auto text-gray-900">
                  <path d="M15 4l-3 22h3l1-7h4l1 7h3L21 4h-6zm1 12l1.5-9L19 16h-3z" />
                  <path d="M31 8h-4v14h3v-5h1c2.8 0 5-2.2 5-5s-2.2-4-5-4zm0 6h-1v-3h1c.8 0 1.5.7 1.5 1.5S31.8 14 31 14z" />
                  <path d="M44 8h-4v14h3v-5h1c2.8 0 5-2.2 5-5s-2.2-4-5-4zm0 6h-1v-3h1c.8 0 1.5.7 1.5 1.5S44.8 14 44 14z" />
                  <path d="M57 8h-6v14h6v-3h-3v-3h3v-2h-3v-3h3z" />
                  <path d="M66 8h-3v14h3v-4l4 4h4l-5-7 5-7h-4l-4 4z" />
                  <path d="M82 8h-6v14h3v-5h3c2.8 0 5-2.2 5-5s-2.2-4-5-4zm0 6h-3v-3h3c.8 0 1.5.7 1.5 1.5S82.8 14 82 14z" />
                  <path d="M98 8h-8v3h2.5v11H96V11h2z" />
                  <path d="M107 8h-6v14h6v-3h-3v-3h3v-2h-3v-3h3z" />
                  <path d="M117 8h-3v14h3v-4l4 4h4l-5-7 5-7h-4l-4 4z" />
                  <path d="M129 14l-4-6h-3v14h3v-8l4 6 4-6v8h3V8h-3z" />
                </svg>
              </div>
              <div className="h-6 sm:h-8 w-auto">
                <svg viewBox="0 0 180 30" fill="currentColor" className="h-6 sm:h-8 w-auto text-gray-900">
                  <path d="M30 8h-6v14h3V11h3c1.1 0 2 .9 2 2v9h3v-9c0-2.8-2.2-5-5-5z" />
                  <path d="M15 8l-3 7-3-7H6l5 14h2l5-14z" />
                  <path d="M47.5 8h-9v14h3v-5h6v-3h-6v-3h6z" />
                  <path d="M57.5 11h3c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2h-3c-1.1 0-2-.9-2-2v-6c0-1.1.9-2 2-2zm0-3c-2.8 0-5 2.2-5 5v6c0 2.8 2.2 5 5 5h3c2.8 0 5-2.2 5-5v-6c0-2.8-2.2-5-5-5h-3z" />
                  <path d="M77.5 8h-3v14h3v-4l4 4h4l-5-7 5-7h-4l-4 4z" />
                  <path d="M92.5 11h3c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2h-3c-1.1 0-2-.9-2-2v-6c0-1.1.9-2 2-2zm0-3c-2.8 0-5 2.2-5 5v6c0 2.8 2.2 5 5 5h3c2.8 0 5-2.2 5-5v-6c0-2.8-2.2-5-5-5h-3z" />
                  <path d="M117.5 8h-3v14h3v-4l4 4h4l-5-7 5-7h-4l-4 4z" />
                  <path d="M132.5 8h-6v14h3V11h3c1.1 0 2 .9 2 2v9h3v-9c0-2.8-2.2-5-5-5z" />
                  <path d="M147.5 8h-3v14h3z" />
                  <path d="M162.5 8h-3v14h3v-10l6 10h3V8h-3v10z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative bg-gray-900 py-12 sm:py-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/pitch-pattern.png')] opacity-10"></div>
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Ready to transform your team management?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg text-gray-300 px-4">
              Join thousands of clubs and teams already using Puma-AI to streamline their operations and improve player development.
            </p>
            <div className="mt-8 sm:mt-10">
              <Button 
                onClick={() => setShowSignupModal(true)}
                className="h-12 px-8 bg-puma-green-500 hover:bg-puma-green-600 text-base w-full sm:w-auto"
              >
                Start your free trial
              </Button>
            </div>
          </div>
        </div>
      </div>

      <UserSignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSignup={handleSignup}
        onSwitchToLogin={switchToLogin}
      />

      <UserLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        onSwitchToSignup={switchToSignup}
      />
    </div>
  );
}
