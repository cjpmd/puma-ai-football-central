
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface UserSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup: () => void;
}

export function UserSignupModal({ isOpen, onClose, onSignup }: UserSignupModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // For demo, let's accept any signup
      toast({
        title: "Account created!",
        description: "You've successfully signed up for Puma-AI.",
      });
      onSignup();
    } catch (err) {
      setError("There was an error creating your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create your account</DialogTitle>
          <DialogDescription>
            Join Puma-AI today and start managing your football team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <div className="bg-red-50 text-red-500 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="text-xs text-muted-foreground">
            By creating an account, you agree to our{" "}
            <a href="/terms" className="text-puma-blue-500 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-puma-blue-500 hover:underline">
              Privacy Policy
            </a>
            .
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="submit"
              className="w-full bg-puma-blue-500 hover:bg-puma-blue-600"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-4 text-center text-sm">
          <span className="text-muted-foreground">Already have an account?</span>{" "}
          <a 
            href="/login" 
            className="text-puma-blue-500 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              onClose();
              // Open login modal
            }}
          >
            Log in
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
