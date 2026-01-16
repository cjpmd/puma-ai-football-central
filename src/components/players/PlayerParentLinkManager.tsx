import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus, Trash2, Mail, Users } from 'lucide-react';

interface LinkedParent {
  id: string;
  userId: string;
  name: string;
  email: string;
  relationship: string;
}

interface PlayerParentLinkManagerProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  onLinksUpdated: () => void;
}

export function PlayerParentLinkManager({
  isOpen,
  onClose,
  playerId,
  playerName,
  onLinksUpdated
}: PlayerParentLinkManagerProps) {
  const [linkedParents, setLinkedParents] = useState<LinkedParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && playerId) {
      loadLinkedParents();
    }
  }, [isOpen, playerId]);

  const loadLinkedParents = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_players')
        .select(`
          id,
          user_id,
          relationship,
          profiles:user_id (
            id,
            name,
            email
          )
        `)
        .eq('player_id', playerId);

      if (error) throw error;

      const parents = data?.map((link: any) => ({
        id: link.id,
        userId: link.user_id,
        name: link.profiles?.name || 'Unknown',
        email: link.profiles?.email || '',
        relationship: link.relationship || 'parent'
      })) || [];

      setLinkedParents(parents);
    } catch (error: any) {
      console.error('Error loading linked parents:', error);
      toast({ title: 'Error', description: 'Failed to load linked parents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('user_players')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({ title: 'Link Removed', description: 'Parent link has been removed' });
      loadLinkedParents();
      onLinksUpdated();
    } catch (error: any) {
      console.error('Error removing link:', error);
      toast({ title: 'Error', description: 'Failed to remove link', variant: 'destructive' });
    }
  };

  const handleInviteParent = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    setIsInviting(true);
    try {
      // Check if user exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail.toLowerCase().trim())
        .maybeSingle();

      if (existingProfile) {
        // Link existing user
        const { error } = await supabase
          .from('user_players')
          .insert({
            user_id: existingProfile.id,
            player_id: playerId,
            relationship: 'parent'
          });

        if (error) {
          if (error.code === '23505') {
            toast({ title: 'Already Linked', description: 'This user is already linked to this player', variant: 'destructive' });
          } else {
            throw error;
          }
          return;
        }

        toast({ title: 'Parent Linked', description: 'Parent has been linked to the player' });
      } else {
        // Create invitation for new user
        const code = crypto.randomUUID().slice(0, 8).toUpperCase();
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('user_invitations')
          .insert({
            email: inviteEmail.toLowerCase().trim(),
            name: inviteName.trim() || 'Parent',
            role: 'parent',
            player_id: playerId,
            invitation_code: code,
            status: 'pending',
            invited_by: user?.id || '',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });

        if (error) throw error;

        toast({ title: 'Invitation Sent', description: `An invitation has been sent to ${inviteEmail}` });
      }

      setInviteEmail('');
      setInviteName('');
      loadLinkedParents();
      onLinksUpdated();
    } catch (error: any) {
      console.error('Error inviting parent:', error);
      toast({ title: 'Error', description: error.message || 'Failed to send invitation', variant: 'destructive' });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Parent Links
          </DialogTitle>
          <DialogDescription>
            Manage linked parents/guardians for {playerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Links */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Linked Parents/Guardians</Label>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : linkedParents.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No parents linked yet
              </div>
            ) : (
              <div className="space-y-2">
                {linkedParents.map((parent) => (
                  <div key={parent.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{parent.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{parent.email}</div>
                      <Badge variant="secondary" className="mt-1 capitalize text-xs">
                        {parent.relationship}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => handleRemoveLink(parent.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Link */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium">Add Parent/Guardian</Label>
            <div className="space-y-2">
              <Input
                placeholder="Name (optional for new users)"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleInviteParent} 
              disabled={isInviting || !inviteEmail.trim()}
              className="w-full"
              size="sm"
            >
              {isInviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Parent
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
