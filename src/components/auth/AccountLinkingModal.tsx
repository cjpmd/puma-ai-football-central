
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { userInvitationService } from '@/services/userInvitationService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AccountLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinked: () => void;
}

export const AccountLinkingModal: React.FC<AccountLinkingModalProps> = ({
  isOpen,
  onClose,
  onLinked
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'role' | 'linking'>('role');
  const [selectedRole, setSelectedRole] = useState<'staff' | 'parent' | 'player'>('staff');
  const [linkingCode, setLinkingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelection = () => {
    if (selectedRole === 'player' || selectedRole === 'parent') {
      setStep('linking');
    } else {
      // Staff doesn't need a linking code
      handleComplete();
    }
  };

  const handleLinking = async () => {
    if (!linkingCode.trim()) {
      toast.error('Please enter a linking code');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await userInvitationService.linkPlayerAccount(linkingCode, user.id);
      toast.success('Account linked successfully!');
      handleComplete();
    } catch (error) {
      console.error('Error linking account:', error);
      toast.error('Invalid linking code or account already linked');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onLinked();
    onClose();
    setStep('role');
    setLinkingCode('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Your Account Setup</DialogTitle>
        </DialogHeader>

        {step === 'role' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please select your role to complete your account setup:
            </p>

            <div className="space-y-2">
              <Label>I am a:</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff Member</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleRoleSelection} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {step === 'linking' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Link Your Account</CardTitle>
                <CardDescription>
                  {selectedRole === 'player' 
                    ? 'Enter your player linking code to access your player details'
                    : 'Enter the player linking code to link to your child\'s account'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="linkingCode">Linking Code</Label>
                  <Input
                    id="linkingCode"
                    value={linkingCode}
                    onChange={(e) => setLinkingCode(e.target.value)}
                    placeholder="Enter your linking code"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep('role')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleLinking}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Linking...' : 'Link Account'}
                  </Button>
                </div>

                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={handleComplete}
                    className="text-sm"
                  >
                    Skip for now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
