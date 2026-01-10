import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/ui/password-strength";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, CheckCircle, Building2 } from "lucide-react";
import { sanitizeText } from "@/utils/inputValidation";

interface ClubSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "club" | "account" | "complete";

export function ClubSetupWizard({ isOpen, onClose, onSuccess }: ClubSetupWizardProps) {
  const [step, setStep] = useState<Step>("club");
  const [isLoading, setIsLoading] = useState(false);
  
  // Club details
  const [clubName, setClubName] = useState("");
  
  // Account details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetForm = () => {
    setStep("club");
    setClubName("");
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const goBack = () => {
    if (step === "account") setStep("club");
  };

  const handleClubSubmit = () => {
    if (!clubName.trim()) {
      toast.error("Please enter a club name");
      return;
    }
    setStep("account");
  };

  const handleCreateAccount = async () => {
    // Validation
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    if (!password) {
      toast.error("Please enter a password");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizeText(email.toLowerCase().trim()),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: sanitizeText(fullName.trim()),
          }
        }
      });

      if (authError) {
        toast.error("Failed to create account", {
          description: authError.message
        });
        return;
      }

      if (!authData.user) {
        toast.error("Failed to create account");
        return;
      }

      // Wait for profile trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      const userId = authData.user.id;

      // Create the club
      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .insert({
          name: sanitizeText(clubName.trim()),
          subscription_type: 'free'
        })
        .select()
        .single();

      if (clubError) {
        console.error("Error creating club:", clubError);
        toast.error("Failed to create club", {
          description: clubError.message
        });
        return;
      }

      // Add user as club official (admin)
      const { error: officialError } = await supabase
        .from("club_officials")
        .insert({
          user_id: userId,
          club_id: clubData.id,
          role: "club_admin"
        });

      if (officialError) {
        console.error("Error adding club official:", officialError);
      }

      // Update profile with club_admin role
      await supabase
        .from("profiles")
        .update({ roles: ["club_admin"] })
        .eq("id", userId);

      setStep("complete");
      
      // Auto-redirect after success
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Something went wrong", {
        description: "Please try again later"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step !== "club" && step !== "complete" && (
              <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {step === "club" && "Set Up Your Club"}
                {step === "account" && "Create Your Account"}
                {step === "complete" && "You're All Set!"}
              </DialogTitle>
              <DialogDescription>
                {step === "club" && "Enter your club details"}
                {step === "account" && "Set up your login credentials"}
                {step === "complete" && "Your club is ready to go"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* Step 1: Club Details */}
          {step === "club" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clubName">Club Name</Label>
                <Input
                  id="clubName"
                  placeholder="e.g., Riverside Football Club"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                As a club admin, you'll be able to create and manage multiple teams under your club.
              </p>

              <Button onClick={handleClubSubmit} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Account Details */}
          {step === "account" && (
            <div className="space-y-4">
              {/* Club Preview */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{clubName}</p>
                  <p className="text-sm text-muted-foreground">Club Administrator</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Your Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordStrength password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleCreateAccount} 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Account & Club"
                )}
              </Button>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === "complete" && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Welcome to {clubName}!</h3>
                <p className="text-muted-foreground mt-1">
                  Your club has been created. Redirecting to your dashboard...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2 pt-2">
          <div className={`h-1.5 w-8 rounded-full ${step === "club" || step === "account" || step === "complete" ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-1.5 w-8 rounded-full ${step === "account" || step === "complete" ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-1.5 w-8 rounded-full ${step === "complete" ? "bg-primary" : "bg-muted"}`} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
