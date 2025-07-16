import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Player } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Mail, Phone, Users, Link } from 'lucide-react';

interface PlayerParentsModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface Parent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  link_code: string;
  player_id: string;
}

export const PlayerParentsModal: React.FC<PlayerParentsModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parents, setParents] = useState<Parent[]>([]);
  const [newParent, setNewParent] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadParents();
    }
  }, [isOpen, player.id]);

  const loadParents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('player_id', player.id);

      if (error) throw error;
      setParents(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load parents',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddParent = async () => {
    if (!newParent.name.trim() || !newParent.email.trim()) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('parents')
        .insert({
          name: newParent.name.trim(),
          email: newParent.email.trim(),
          phone: newParent.phone.trim() || null,
          player_id: player.id
        })
        .select()
        .single();

      if (error) throw error;

      setParents(prev => [...prev, data]);
      setNewParent({ name: '', email: '', phone: '' });
      
      toast({
        title: 'Success',
        description: 'Parent added successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add parent',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveParent = async (parentId: string) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent) return;

    if (!confirm(`Are you sure you want to remove ${parent.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('parents')
        .delete()
        .eq('id', parentId);

      if (error) throw error;

      setParents(prev => prev.filter(p => p.id !== parentId));
      toast({
        title: 'Success',
        description: 'Parent removed successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove parent',
        variant: 'destructive'
      });
    }
  };

  const handleSendInvite = async (parent: Parent) => {
    try {
      // Call the send invitation edge function
      const { error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: parent.email,
          name: parent.name,
          role: 'parent',
          teamId: player.teamId,
          playerId: player.id,
          invitationCode: parent.link_code
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Invitation sent to ${parent.name}`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive'
      });
    }
  };

  const copyLinkCode = async (linkCode: string) => {
    try {
      await navigator.clipboard.writeText(linkCode);
      toast({
        title: 'Success',
        description: 'Link code copied to clipboard'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link code',
        variant: 'destructive'
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Manage Parents</SheetTitle>
          <p className="text-sm text-muted-foreground">{player.name}</p>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add New Parent */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Add New Parent/Guardian</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parentName">Name</Label>
                <Input
                  id="parentName"
                  value={newParent.name}
                  onChange={(e) => setNewParent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter parent/guardian name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentEmail">Email</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={newParent.email}
                  onChange={(e) => setNewParent(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Phone (Optional)</Label>
                <Input
                  id="parentPhone"
                  type="tel"
                  value={newParent.phone}
                  onChange={(e) => setNewParent(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <Button onClick={handleAddParent} disabled={saving} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {saving ? 'Adding...' : 'Add Parent'}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Parents */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading parents...</p>
            </div>
          ) : parents.length > 0 ? (
            <div className="space-y-4">
              {parents.map(parent => (
                <Card key={parent.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm">{parent.name}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveParent(parent.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{parent.email}</span>
                      </div>
                      {parent.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{parent.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Link className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium">Link Code:</span>
                        <Badge variant="outline" className="text-xs">
                          {parent.link_code}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLinkCode(parent.link_code)}
                          className="h-6 px-2"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendInvite(parent)}
                        className="flex-1"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invite
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No parents/guardians added yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="border-t p-6">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
