
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { validateEmail, sanitizeText, isRateLimited } from "@/utils/inputValidation";
import { securityService } from "@/services/securityService";

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSwitchToSignup?: () => void;
}

export function UserLoginModal({ isOpen, onClose, onLogin, onSwitchToSignup }: UserLoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);

    try {
      // Enhanced security validation
      const validation = await securityService.validateAuthInput(email, password, 'login');
      
      if (!validation.isValid) {
        toast.error("Authentication failed", {
          description: validation.errors.join(". ")
        });
        return;
      }

      // Log potential security issues
      if (validation.riskLevel === 'high' || validation.riskLevel === 'critical') {
        await securityService.logSecurityEvent({
          eventType: 'HIGH_RISK_LOGIN_ATTEMPT',
          details: { email: email.substring(0, 3) + '***', riskLevel: validation.riskLevel },
          riskLevel: validation.riskLevel
        });
      }

      // Sanitize inputs
      const sanitizedEmail = securityService.sanitizeInput(email.toLowerCase().trim(), 254);
      
      const { error } = await signIn(sanitizedEmail, password);
      
      if (error) {
        // Log failed login attempt
        await securityService.logSecurityEvent({
          eventType: 'LOGIN_FAILED',
          details: { 
            email: sanitizedEmail.substring(0, 3) + '***', 
            error: error.message,
            userAgent: navigator.userAgent 
          },
          riskLevel: 'medium'
        });
        
        toast.error("Login failed", {
          description: error.message
        });
      } else {
        // Log successful login
        await securityService.logSecurityEvent({
          eventType: 'LOGIN_SUCCESS',
          details: { email: sanitizedEmail.substring(0, 3) + '***' },
          riskLevel: 'low'
        });
        
        toast.success("Welcome back!", {
          description: "You've successfully logged in."
        });
        onLogin();
      }
    } catch (error) {
      console.error('Login error:', error);
      
      await securityService.logSecurityEvent({
        eventType: 'LOGIN_ERROR',
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

  const handleSwitchToSignup = () => {
    if (onSwitchToSignup) {
      onSwitchToSignup();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log in to your account</DialogTitle>
          <DialogDescription>
            Enter your credentials to access your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                className="text-sm text-puma-blue-500 hover:text-puma-blue-600"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-puma-blue-500 hover:bg-puma-blue-600"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account?</span>{" "}
            <button
              type="button"
              onClick={handleSwitchToSignup}
              className="text-puma-blue-500 hover:text-puma-blue-600 underline"
            >
              Sign up
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
