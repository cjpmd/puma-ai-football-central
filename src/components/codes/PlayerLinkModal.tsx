import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { playerCodeService } from "@/services/playerCodeService";
import { Loader2, User, UserCheck } from "lucide-react";

interface PlayerLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PlayerLinkModal({ isOpen, onClose, onSuccess }: PlayerLinkModalProps) {
  const [step, setStep] = useState(1);
  const [linkingCode, setLinkingCode] = useState("");
  const [linkType, setLinkType] = useState<'player' | 'parent'>('player');
  const [player, setPlayer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleVerifyCode = async () => {
    if (!linkingCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a linking code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      let foundPlayer;
      if (linkType === 'player') {
        foundPlayer = await playerCodeService.getPlayerByLinkingCode(linkingCode.trim());
      } else {
        foundPlayer = await playerCodeService.getPlayerByParentLinkingCode(linkingCode.trim());
      }
      
      if (foundPlayer) {
        setPlayer(foundPlayer);
        setStep(2);
      } else {
        toast({
          title: "Invalid Code",
          description: `The ${linkType} linking code you entered is not valid or has expired`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify linking code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkToPlayer = async () => {
    setIsLoading(true);
    try {
      if (linkType === 'player') {
        await playerCodeService.linkUserToPlayer(linkingCode.trim());
      } else {
        await playerCodeService.linkUserToPlayerAsParent(linkingCode.trim());
      }
      
      toast({
        title: "Success",
        description: `Successfully linked to ${player.name}!`,
      });
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link to player",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setLinkingCode("");
    setLinkType('player');
    setPlayer(null);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link to Player</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Link Type</Label>
              <RadioGroup value={linkType} onValueChange={(value) => setLinkType(value as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="player" id="player" />
                  <Label htmlFor="player" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Link as Player
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parent" id="parent" />
                  <Label htmlFor="parent" className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Link as Parent
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkingCode">
                {linkType === 'player' ? 'Player' : 'Parent'} Linking Code
              </Label>
              <Input
                id="linkingCode"
                value={linkingCode}
                onChange={(e) => setLinkingCode(e.target.value)}
                placeholder={`Enter ${linkType} linking code`}
                className="text-center font-mono text-lg"
              />
              <p className="text-sm text-muted-foreground">
                Enter the {linkType} linking code provided by your team manager
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

        {step === 2 && player && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                {player.photo_url ? (
                  <img 
                    src={player.photo_url} 
                    alt={player.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{player.name}</h3>
                  <p className="text-sm text-muted-foreground">#{player.squad_number}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{player.team_name}</p>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                You will be linked to this player as {linkType === 'player' ? 'the player' : 'a parent'}.
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleLinkToPlayer}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Link to Player
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}