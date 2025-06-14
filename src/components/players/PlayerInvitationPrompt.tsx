
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Users, User } from 'lucide-react';

interface PlayerInvitationPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitePlayer: () => void;
  onInviteParent: () => void;
  onSkip: () => void;
  playerName: string;
}

export const PlayerInvitationPrompt: React.FC<PlayerInvitationPromptProps> = ({
  isOpen,
  onClose,
  onInvitePlayer,
  onInviteParent,
  onSkip,
  playerName
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Player Created Successfully!
          </DialogTitle>
          <DialogDescription>
            {playerName} has been added to your squad. Would you like to invite them or their parent/guardian to create an account?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>{playerName}</strong> has been successfully added to your team. 
              You can now invite them or their parent to access their player profile and details.
            </p>
          </div>

          <div className="grid gap-3">
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={onInvitePlayer}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Invite Player
                </CardTitle>
                <CardDescription className="text-xs">
                  Send invitation to the player themselves (if old enough to manage their own account)
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={onInviteParent}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Invite Parent/Guardian
                </CardTitle>
                <CardDescription className="text-xs">
                  Send invitation to a parent or guardian to manage the player's account
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="flex justify-between gap-2 pt-4">
            <Button variant="outline" onClick={onSkip} className="flex-1">
              Skip for Now
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Done
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            You can always send invitations later from the player's profile or User Management section.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
