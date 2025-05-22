
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

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function UserLoginModal({ isOpen, onClose, onLogin }: UserLoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // For demo, let's accept any login
      onLogin();
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Log in to Puma-AI</DialogTitle>
          <DialogDescription>
            Enter your credentials to access your account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <div className="bg-red-50 text-red-500 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a 
                href="/forgot-password" 
                className="text-xs text-puma-blue-500 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  // Handle forgot password
                }}
              >
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="submit"
              className="w-full bg-puma-blue-500 hover:bg-puma-blue-600"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-4 text-center text-sm">
          <span className="text-muted-foreground">Don't have an account?</span>{" "}
          <a 
            href="/signup" 
            className="text-puma-blue-500 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              onClose();
              // Open signup modal
            }}
          >
            Sign up
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
