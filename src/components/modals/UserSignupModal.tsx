
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { validatePasswordStrength, validateEmail, validateName, sanitizeText, isRateLimited } from "@/utils/inputValidation";
import { securityService } from "@/services/securityService";
import { PasswordStrength } from "@/components/ui/password-strength";

interface UserSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup: () => void;
  onSwitchToLogin?: () => void;
}

export function UserSignupModal({ isOpen, onClose, onSignup, onSwitchToLogin }: UserSignupModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);

    try {
      // Enhanced security validation
      const validation = await securityService.validateAuthInput(email, password, 'signup');
      
      if (!validation.isValid) {
        toast.error("Registration failed", {
          description: validation.errors.join(". ")
        });
        return;
      }

      // Additional client-side validation
      const nameValidation = validateName(name);
      if (!nameValidation.isValid) {
        toast.error("Invalid name", {
          description: nameValidation.error
        });
        return;
      }
      
      if (password !== confirmPassword) {
        toast.error("Passwords don't match", {
          description: "Please make sure your passwords match"
        });
        return;
      }

      // Log potential security issues
      if (validation.riskLevel === 'high' || validation.riskLevel === 'critical') {
        await securityService.logSecurityEvent({
          eventType: 'HIGH_RISK_SIGNUP_ATTEMPT',
          details: { 
            email: email.substring(0, 3) + '***', 
            riskLevel: validation.riskLevel,
            userAgent: navigator.userAgent 
          },
          riskLevel: validation.riskLevel
        });
      }

      // Sanitize inputs with enhanced security
      const sanitizedName = securityService.sanitizeInput(name.trim(), 100);
      const sanitizedEmail = securityService.sanitizeInput(email.toLowerCase().trim(), 254);
      
      const { data, error } = await signUp(sanitizedEmail, password, sanitizedName);
      
      if (error) {
        // Log failed signup attempt
        await securityService.logSecurityEvent({
          eventType: 'SIGNUP_FAILED',
          details: { 
            email: sanitizedEmail.substring(0, 3) + '***', 
            error: error.message,
            userAgent: navigator.userAgent 
          },
          riskLevel: 'medium'
        });
        
        toast.error("Registration failed", {
          description: error.message
        });
      } else if (data.session) {
        // User was auto-logged in
        await securityService.logSecurityEvent({
          eventType: 'SIGNUP_SUCCESS_AUTO_LOGIN',
          details: { email: sanitizedEmail.substring(0, 3) + '***' },
          riskLevel: 'low'
        });
        
        toast.success("Welcome to Puma-AI!", {
          description: "Your account has been created and you are now logged in."
        });
        onSignup();
      } else {
        // Email confirmation is required
        await securityService.logSecurityEvent({
          eventType: 'SIGNUP_SUCCESS_PENDING_CONFIRMATION',
          details: { email: sanitizedEmail.substring(0, 3) + '***' },
          riskLevel: 'low'
        });
        
        toast.success("Account created", {
          description: "Please check your email to confirm your account."
        });
        onClose();
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      await securityService.logSecurityEvent({
        eventType: 'SIGNUP_ERROR',
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          userAgent: navigator.userAgent 
        },
        riskLevel: 'high'
      });
      
      toast.error("Something went wrong", {
        description: "Please try again later."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLogin = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create an account</DialogTitle>
          <DialogDescription>
            Sign up to start using Puma-AI.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Smith"
              value={name}
              onChange={(e) => setName(sanitizeText(e.target.value))}
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(sanitizeText(e.target.value))}
              maxLength={254}
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
              required
            />
            <PasswordStrength password={password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-puma-blue-500 hover:bg-puma-blue-600"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </Button>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account?</span>{" "}
            <button
              type="button"
              onClick={handleSwitchToLogin}
              className="text-puma-blue-500 hover:text-puma-blue-600 underline"
            >
              Sign in
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
