import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { teamCodeService } from "@/services/teamCodeService";
import { Loader2, Users, UserCheck, Briefcase } from "lucide-react";

interface TeamJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TeamJoinModal({ isOpen, onClose, onSuccess }: TeamJoinModalProps) {
  const [step, setStep] = useState(1);
  const [joinCode, setJoinCode] = useState("");
  const [role, setRole] = useState<'player' | 'parent' | 'staff'>('player');
  const [team, setTeam] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [additionalData, setAdditionalData] = useState({
    playerName: "",
    parentName: "",
    staffName: "",
    email: ""
  });
  const { toast } = useToast();

  const handleVerifyCode = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a join code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const foundTeam = await teamCodeService.getTeamByJoinCode(joinCode.trim().toUpperCase());
      if (foundTeam) {
        setTeam(foundTeam);
        setStep(2);
      } else {
        toast({
          title: "Invalid Code",
          description: "The join code you entered is not valid or has expired",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify join code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTeam = async () => {
    setIsLoading(true);
    try {
      await teamCodeService.joinTeamWithCode(joinCode.trim().toUpperCase(), role, additionalData);
      toast({
        title: "Success",
        description: `Successfully joined ${team.name}!`,
      });
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join team",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setJoinCode("");
    setRole('player');
    setTeam(null);
    setAdditionalData({
      playerName: "",
      parentName: "",
      staffName: "",
      email: ""
    });
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Team with Code</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joinCode">Team Join Code</Label>
              <Input
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter team join code"
                className="text-center font-mono text-lg"
              />
              <p className="text-sm text-muted-foreground">
                Enter the team join code provided by your team manager
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleVerifyCode}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify Code
              </Button>
            </div>
          </div>
        )}

        {step === 2 && team && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                {team.logo_url ? (
                  <img 
                    src={team.logo_url} 
                    alt={team.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <h3 className="font-semibold">{team.name}</h3>
              </div>
              {team.club_name && (
                <p className="text-sm text-muted-foreground">{team.club_name}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>How do you want to join this team?</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="player" id="player" />
                  <Label htmlFor="player" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    As a Player
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parent" id="parent" />
                  <Label htmlFor="parent" className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    As a Parent
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="staff" id="staff" />
                  <Label htmlFor="staff" className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    As Staff
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {role === 'player' && (
              <div className="space-y-2">
                <Label htmlFor="playerName">Player Name</Label>
                <Input
                  id="playerName"
                  value={additionalData.playerName}
                  onChange={(e) => setAdditionalData(prev => ({ ...prev, playerName: e.target.value }))}
                  placeholder="Enter player name"
                />
              </div>
            )}

            {role === 'staff' && (
              <div className="space-y-2">
                <Label htmlFor="staffName">Staff Name</Label>
                <Input
                  id="staffName"
                  value={additionalData.staffName}
                  onChange={(e) => setAdditionalData(prev => ({ ...prev, staffName: e.target.value }))}
                  placeholder="Enter staff name"
                />
                <Label htmlFor="staffEmail">Email</Label>
                <Input
                  id="staffEmail"
                  type="email"
                  value={additionalData.email}
                  onChange={(e) => setAdditionalData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleJoinTeam}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Join Team
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}