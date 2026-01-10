import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PasswordStrength } from "@/components/ui/password-strength";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, CheckCircle, Users } from "lucide-react";
import { sanitizeText } from "@/utils/inputValidation";
import { GameFormat } from "@/types";

interface TeamSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "team" | "account" | "complete";

export function TeamSetupWizard({ isOpen, onClose, onSuccess }: TeamSetupWizardProps) {
  const [step, setStep] = useState<Step>("team");
  const [isLoading, setIsLoading] = useState(false);
  
  // Team details
  const [teamName, setTeamName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [gameFormat, setGameFormat] = useState<GameFormat>("7-a-side");
  
  // Account details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetForm = () => {
    setStep("team");
    setTeamName("");
    setAgeGroup("");
    setGameFormat("7-a-side");
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
    if (step === "account") setStep("team");
  };

  const handleTeamSubmit = () => {
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }
    if (!ageGroup.trim()) {
      toast.error("Please enter an age group");
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

      // Create the team
      const currentDate = new Date();
      const seasonStart = new Date(currentDate.getFullYear(), 7, 1).toISOString().split('T')[0]; // Aug 1
      const seasonEnd = new Date(currentDate.getFullYear() + 1, 5, 30).toISOString().split('T')[0]; // Jun 30

      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: sanitizeText(teamName.trim()),
          age_group: sanitizeText(ageGroup.trim()),
          game_format: gameFormat,
          season_start: seasonStart,
          season_end: seasonEnd,
          subscription_type: 'free'
        })
        .select()
        .single();

      if (teamError) {
        console.error("Error creating team:", teamError);
        toast.error("Failed to create team", {
          description: teamError.message
        });
        return;
      }

      // Link user to team as manager
      const { error: linkError } = await supabase
        .from("user_teams")
        .insert({
          user_id: userId,
          team_id: teamData.id,
          role: "team_manager"
        });

      if (linkError) {
        console.error("Error linking user to team:", linkError);
      }

      // Update profile with team_manager role
      await supabase
        .from("profiles")
        .update({ roles: ["team_manager"] })
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
            {step !== "team" && step !== "complete" && (
              <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {step === "team" && "Set Up Your Team"}
                {step === "account" && "Create Your Account"}
                {step === "complete" && "You're All Set!"}
              </DialogTitle>
              <DialogDescription>
                {step === "team" && "Enter your team details"}
                {step === "account" && "Set up your login credentials"}
                {step === "complete" && "Your team is ready to go"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* Step 1: Team Details */}
          {step === "team" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  placeholder="e.g., Riverside FC U12"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ageGroup">Age Group</Label>
                <Input
                  id="ageGroup"
                  placeholder="e.g., U12, U15, Senior"
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gameFormat">Game Format</Label>
                <Select value={gameFormat} onValueChange={(value: GameFormat) => setGameFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5-a-side">5v5</SelectItem>
                    <SelectItem value="7-a-side">7v7</SelectItem>
                    <SelectItem value="9-a-side">9v9</SelectItem>
                    <SelectItem value="11-a-side">11v11</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleTeamSubmit} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Account Details */}
          {step === "account" && (
            <div className="space-y-4">
              {/* Team Preview */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{teamName}</p>
                  <p className="text-sm text-muted-foreground">{ageGroup} • {gameFormat}</p>
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
                  "Create Account & Team"
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
                <h3 className="font-semibold text-lg">Welcome to {teamName}!</h3>
                <p className="text-muted-foreground mt-1">
                  Your team has been created. Redirecting to your dashboard...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2 pt-2">
          <div className={`h-1.5 w-8 rounded-full ${step === "team" || step === "account" || step === "complete" ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-1.5 w-8 rounded-full ${step === "account" || step === "complete" ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-1.5 w-8 rounded-full ${step === "complete" ? "bg-primary" : "bg-muted"}`} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
