import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PasswordStrength } from "@/components/ui/password-strength";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { teamCodeService } from "@/services/teamCodeService";
import { playerCodeService, PlayerWithCodes } from "@/services/playerCodeService";
import { ArrowLeft, Users, User, UserCheck, Shield, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { sanitizeText } from "@/utils/inputValidation";

interface UnifiedSignupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToLogin?: () => void;
}

type Step = "code" | "role" | "playerCode" | "details" | "account" | "complete";
type Role = "player" | "parent" | "staff";

interface TeamInfo {
  id: string;
  name: string;
  logo_url: string | null;
  club_name: string | null;
}

export function UnifiedSignupWizard({ isOpen, onClose, onSuccess, onSwitchToLogin }: UnifiedSignupWizardProps) {
  const [step, setStep] = useState<Step>("code");
  const [teamCode, setTeamCode] = useState("");
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Player code for linking
  const [playerCode, setPlayerCode] = useState("");
  const [matchedPlayer, setMatchedPlayer] = useState<PlayerWithCodes | null>(null);
  const [playerCodeError, setPlayerCodeError] = useState<string | null>(null);
  
  // Staff role selection
  const [staffRole, setStaffRole] = useState("team_coach");
  
  // Account details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetForm = () => {
    setStep("code");
    setTeamCode("");
    setTeamInfo(null);
    setSelectedRole(null);
    setPlayerCode("");
    setMatchedPlayer(null);
    setPlayerCodeError(null);
    setStaffRole("team_coach");
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleVerifyCode = async () => {
    if (!teamCode.trim()) {
      toast.error("Please enter a team code");
      return;
    }

    setIsLoading(true);
    try {
      const team = await teamCodeService.getTeamByJoinCode(teamCode.trim().toUpperCase());
      
      if (!team) {
        toast.error("Invalid team code", {
          description: "Please check the code and try again"
        });
        return;
      }

      setTeamInfo({
        id: team.id,
        name: team.name,
        logo_url: team.logo_url,
        club_name: team.club_name
      });
      setStep("role");
    } catch (error) {
      console.error("Error verifying code:", error);
      toast.error("Failed to verify code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = () => {
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }
    
    // Players and Parents need to enter a player code
    if (selectedRole === "player" || selectedRole === "parent") {
      setStep("playerCode");
    } else {
      // Staff go directly to staff details
      setStep("details");
    }
  };

  const handleVerifyPlayerCode = async () => {
    if (!playerCode.trim()) {
      setPlayerCodeError("Please enter a player code");
      return;
    }

    setIsLoading(true);
    setPlayerCodeError(null);

    try {
      let player: PlayerWithCodes | null = null;

      if (selectedRole === "player") {
        // Use player linking code
        player = await playerCodeService.getPlayerByLinkingCode(playerCode.trim());
        
        if (!player) {
          setPlayerCodeError("Invalid player code. Please check the code and try again.");
          return;
        }
      } else if (selectedRole === "parent") {
        // Use parent linking code
        player = await playerCodeService.getPlayerByParentLinkingCode(playerCode.trim());
        
        if (!player) {
          setPlayerCodeError("Invalid parent code. Please check the code and try again.");
          return;
        }

        // Check if parent code is expired
        if (player.parent_linking_code_expires_at && new Date(player.parent_linking_code_expires_at) < new Date()) {
          setPlayerCodeError("This parent code has expired. Please ask the team manager for a new code.");
          return;
        }
      }

      if (player) {
        setMatchedPlayer(player);
        // Pre-fill the full name with the player's name for players
        if (selectedRole === "player") {
          setFullName(player.name);
        }
        setStep("account");
      }
    } catch (error) {
      console.error("Error verifying player code:", error);
      setPlayerCodeError("Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetailsSubmit = () => {
    // Only staff reach this step now
    if (selectedRole === "staff" && !staffRole) {
      toast.error("Please select your staff role");
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
            signup_team_id: teamInfo?.id,
            signup_role: selectedRole
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

      // Wait a moment for the profile trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Now create role-specific associations
      const userId = authData.user.id;

      if (selectedRole === "player" && matchedPlayer) {
        // Link user to existing player
        const { error: linkError } = await supabase
          .from("user_players")
          .insert({
            user_id: userId,
            player_id: matchedPlayer.id,
            relationship: "self"
          });

        if (linkError) {
          console.error("Error linking user to player:", linkError);
        }

        // Add user to team as player
        await supabase.from("user_teams").insert({
          team_id: matchedPlayer.team_id,
          user_id: userId,
          role: "team_player"
        });
          
        // Add player role to profile
        await supabase
          .from("profiles")
          .update({ roles: ["player"] })
          .eq("id", userId);

      } else if (selectedRole === "parent" && matchedPlayer) {
        // Link user to player as parent
        const { error: linkError } = await supabase
          .from("user_players")
          .insert({
            user_id: userId,
            player_id: matchedPlayer.id,
            relationship: "parent"
          });

        if (linkError) {
          console.error("Error linking parent to player:", linkError);
        }

        // Add user to team as parent
        await supabase.from("user_teams").insert({
          team_id: matchedPlayer.team_id,
          user_id: userId,
          role: "team_parent"
        });

        // Update profile with parent role
        await supabase
          .from("profiles")
          .update({ roles: ["parent"] })
          .eq("id", userId);

      } else if (selectedRole === "staff") {
        // Create user_teams entry for staff
        await supabase.from("user_teams").insert({
          user_id: userId,
          team_id: teamInfo!.id,
          role: staffRole
        });

        // Update profile with staff role
        const roleMap: Record<string, string> = {
          team_manager: "team_manager",
          team_assistant_manager: "team_assistant_manager",
          team_coach: "coach"
        };
        await supabase
          .from("profiles")
          .update({ roles: [roleMap[staffRole] || "coach"] })
          .eq("id", userId);
      }

      // Track code usage
      await teamCodeService.trackCodeUsage(
        teamInfo!.id,
        teamCode,
        userId,
        selectedRole!
      );

      setStep("complete");
      
      // Auto-redirect to dashboard after brief success message
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Something went wrong", {
        description: "Please try again later"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (step === "role") setStep("code");
    else if (step === "playerCode") setStep("role");
    else if (step === "details") setStep("role");
    else if (step === "account") {
      if (selectedRole === "player" || selectedRole === "parent") {
        setStep("playerCode");
      } else {
        setStep("details");
      }
    }
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case "player": return <User className="h-5 w-5" />;
      case "parent": return <Users className="h-5 w-5" />;
      case "staff": return <Shield className="h-5 w-5" />;
    }
  };

  const getRoleDescription = (role: Role) => {
    switch (role) {
      case "player": return "I'm a player on this team";
      case "parent": return "I'm a parent/guardian of a player";
      case "staff": return "I'm a coach or team staff member";
    }
  };

  // Calculate progress steps based on role
  const getProgressSteps = () => {
    if (selectedRole === "staff") {
      return ["code", "role", "details", "account"];
    }
    return ["code", "role", "playerCode", "account"];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step !== "code" && step !== "complete" && (
              <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {step === "code" && "Join a Team"}
                {step === "role" && "Select Your Role"}
                {step === "playerCode" && (selectedRole === "player" ? "Enter Your Player Code" : "Enter Parent Code")}
                {step === "details" && "Your Details"}
                {step === "account" && "Create Account"}
                {step === "complete" && "Welcome!"}
              </DialogTitle>
              <DialogDescription>
                {step === "code" && "Enter the team code shared with you"}
                {step === "role" && `Joining ${teamInfo?.name}`}
                {step === "playerCode" && (selectedRole === "player" 
                  ? "Ask your team manager for your player linking code"
                  : "Ask the team manager for your child's parent linking code"
                )}
                {step === "details" && "Tell us a bit more about yourself"}
                {step === "account" && "Set up your login credentials"}
                {step === "complete" && "You're all set!"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* Step 1: Enter Team Code */}
          {step === "code" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamCode">Team Code</Label>
                <Input
                  id="teamCode"
                  placeholder="Enter code (e.g., ABC123)"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  className="text-center text-lg tracking-wider font-mono"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  Ask your team manager for the team code
                </p>
              </div>
              <Button 
                onClick={handleVerifyCode} 
                className="w-full"
                disabled={isLoading || !teamCode.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
              <div className="text-center text-sm text-muted-foreground pt-2">
                <span>Already have an account?</span>{" "}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Role */}
          {step === "role" && (
            <div className="space-y-4">
              {/* Team Info Card */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {teamInfo?.logo_url ? (
                  <img 
                    src={teamInfo.logo_url} 
                    alt={teamInfo.name} 
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{teamInfo?.name}</p>
                {teamInfo?.club_name && (
                    <p className="text-sm text-muted-foreground">{teamInfo.club_name}</p>
                  )}
                </div>
              </div>

              <RadioGroup 
                value={selectedRole || ""} 
                onValueChange={(v) => setSelectedRole(v as Role)}
                className="space-y-3"
              >
                {(["player", "parent", "staff"] as Role[]).map((role) => (
                  <div key={role} className="flex items-center space-x-3">
                    <RadioGroupItem value={role} id={role} />
                    <Label 
                      htmlFor={role} 
                      className="flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      {getRoleIcon(role)}
                      <div>
                        <p className="font-medium capitalize">{role}</p>
                        <p className="text-sm text-muted-foreground">{getRoleDescription(role)}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <Button 
                onClick={handleRoleSelect} 
                className="w-full"
                disabled={!selectedRole}
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 3: Player Code (for Player/Parent roles) */}
          {step === "playerCode" && (
            <div className="space-y-4">
              {/* Team Info Reminder */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {teamInfo?.logo_url ? (
                  <img 
                    src={teamInfo.logo_url} 
                    alt={teamInfo.name} 
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{teamInfo?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">Joining as {selectedRole}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="playerCode">
                  {selectedRole === "player" ? "Player Code" : "Parent Code"}
                </Label>
                <Input
                  id="playerCode"
                  placeholder={selectedRole === "player" ? "Enter your player code" : "Enter parent linking code"}
                  value={playerCode}
                  onChange={(e) => {
                    setPlayerCode(e.target.value);
                    setPlayerCodeError(null);
                  }}
                  className="text-center text-lg tracking-wider font-mono"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedRole === "player" 
                    ? "Your team manager can provide your unique player code"
                    : "Ask the team manager for your child's parent linking code"
                  }
                </p>
              </div>

              {playerCodeError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{playerCodeError}</span>
                </div>
              )}

              {matchedPlayer && (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-sm text-green-800 dark:text-green-200">
                      {selectedRole === "player" ? "Linking to:" : "Linking as parent of:"}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">{matchedPlayer.name}</p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleVerifyPlayerCode} 
                className="w-full"
                disabled={isLoading || !playerCode.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </Button>
            </div>
          )}

          {/* Step 4: Staff Details (only for staff role) */}
          {step === "details" && (
            <div className="space-y-4">
              {selectedRole === "staff" && (
                <div className="space-y-2">
                  <Label>Your Role on the Team</Label>
                  <RadioGroup 
                    value={staffRole} 
                    onValueChange={setStaffRole}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="team_manager" id="team_manager" />
                      <Label htmlFor="team_manager" className="cursor-pointer">Team Manager</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="team_assistant_manager" id="team_assistant_manager" />
                      <Label htmlFor="team_assistant_manager" className="cursor-pointer">Assistant Manager</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="team_coach" id="team_coach" />
                      <Label htmlFor="team_coach" className="cursor-pointer">Coach</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <Button onClick={handleDetailsSubmit} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {/* Step 5: Account Creation */}
          {step === "account" && (
            <div className="space-y-4">
              {/* Show matched player info for player/parent */}
              {matchedPlayer && (selectedRole === "player" || selectedRole === "parent") && (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {selectedRole === "player" ? "Creating account for:" : "Parent account for:"}
                    </p>
                    <p className="font-medium text-sm text-green-800 dark:text-green-200 truncate">
                      {matchedPlayer.name}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(sanitizeText(e.target.value))}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
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
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          )}

          {/* Step 6: Complete */}
          {step === "complete" && (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Welcome to {teamInfo?.name}!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  You've successfully joined as a {selectedRole}.
                  {matchedPlayer && selectedRole === "player" && (
                    <span className="block mt-1">Your profile is linked to {matchedPlayer.name}.</span>
                  )}
                  {matchedPlayer && selectedRole === "parent" && (
                    <span className="block mt-1">You're linked as a parent of {matchedPlayer.name}.</span>
                  )}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Redirecting you to your dashboard...
              </p>
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        {step !== "complete" && (
          <div className="flex justify-center gap-2 pb-2">
            {getProgressSteps().map((s, i) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full transition-colors ${
                  getProgressSteps().indexOf(step) >= i
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
