import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Player } from '@/types';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { 
  Edit, 
  Users, 
  Brain, 
  Target, 
  MessageSquare, 
  BarChart3, 
  History, 
  ArrowRightLeft, 
  UserMinus,
  Shield,
  ShieldCheck
} from 'lucide-react';

interface PlayerActionSheetProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onEditPlayer: (player: Player) => void;
  onManageParents: (player: Player) => void;
  onManageAttributes: (player: Player) => void;
  onManageObjectives: (player: Player) => void;
  onManageComments: (player: Player) => void;
  onViewStats: (player: Player) => void;
  onViewHistory: (player: Player) => void;
  onTransferPlayer: (player: Player) => void;
  onLeaveTeam: (player: Player) => void;
}

export const PlayerActionSheet: React.FC<PlayerActionSheetProps> = ({
  player,
  isOpen,
  onClose,
  onEditPlayer,
  onManageParents,
  onManageAttributes,
  onManageObjectives,
  onManageComments,
  onViewStats,
  onViewHistory,
  onTransferPlayer,
  onLeaveTeam
}) => {
  const { isTeamManager, isGlobalAdmin } = useAuthorization();
  
  const canManageTransfers = isTeamManager(player.teamId) || isGlobalAdmin;

  const handleAction = (action: (player: Player) => void) => {
    action(player);
    onClose();
  };

  const actions = [
    {
      icon: Edit,
      label: 'Edit Player',
      action: () => handleAction(onEditPlayer),
      category: 'management'
    },
    {
      icon: Users,
      label: 'Manage Parents',
      action: () => handleAction(onManageParents),
      category: 'management'
    },
    {
      icon: Brain,
      label: 'Manage Attributes',
      action: () => handleAction(onManageAttributes),
      category: 'development'
    },
    {
      icon: Target,
      label: 'Manage Objectives',
      action: () => handleAction(onManageObjectives),
      category: 'development'
    },
    {
      icon: MessageSquare,
      label: 'Manage Comments',
      action: () => handleAction(onManageComments),
      category: 'development'
    },
    {
      icon: BarChart3,
      label: 'View Statistics',
      action: () => handleAction(onViewStats),
      category: 'analytics'
    },
    {
      icon: History,
      label: 'View History',
      action: () => handleAction(onViewHistory),
      category: 'analytics'
    }
  ];

  const restrictedActions = [
    {
      icon: ArrowRightLeft,
      label: 'Transfer Player',
      action: () => handleAction(onTransferPlayer),
      restricted: true
    },
    {
      icon: UserMinus,
      label: 'Leave Team',
      action: () => handleAction(onLeaveTeam),
      restricted: true
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-xl">Player Management</SheetTitle>
          <SheetDescription>
            Actions for {player.name}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Player Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Player Actions
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-20 flex-col gap-2 p-4"
                    onClick={action.action}
                  >
                    <action.icon className="h-6 w-6" />
                    <span className="text-xs text-center leading-tight">
                      {action.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Restricted Actions */}
            {canManageTransfers && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Admin Actions
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {restrictedActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-20 flex-col gap-2 p-4 border-amber-200 hover:bg-amber-50"
                        onClick={action.action}
                      >
                        <action.icon className="h-6 w-6 text-amber-600" />
                        <span className="text-xs text-center leading-tight">
                          {action.label}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Permission Note */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Access Level</p>
                  <p className="text-xs text-muted-foreground">
                    {canManageTransfers 
                      ? 'You have full management access including transfers'
                      : 'Standard access - some actions may be restricted'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};