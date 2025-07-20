import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Mail, Phone, Users, Link, Edit, Check, X } from 'lucide-react';
import { playersService } from '@/services/playersService';

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
  linkCode: string;
  playerId: string;
  isLinked?: boolean;
  userId?: string;
  subscriptionType?: string;
  subscriptionStatus?: string;
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
  const [editingParent, setEditingParent] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name: string; email: string; phone: string }>({
    name: '',
    email: '',
    phone: ''
  });
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
      const parentData = await playersService.getParentsByPlayerId(player.id);
      setParents(parentData);
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

      // Transform database result to match our interface
      const transformedParent: Parent = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        linkCode: data.link_code,
        playerId: data.player_id,
        isLinked: false
      };
      setParents(prev => [...prev, transformedParent]);
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

  const handleUpdateParent = async (parentId: string, updatedData: { name: string; email: string; phone: string }) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent) return;

    try {
      setSaving(true);

      if (parent.isLinked) {
        toast({
          title: 'Info',
          description: 'Linked parent details must be updated from their user profile',
          variant: 'default'
        });
        setEditingParent(null);
        return;
      }

      // Don't try to update linked parents with invalid UUID format
      if (parentId.startsWith('linked_')) {
        toast({
          title: 'Info',
          description: 'Linked parent details cannot be edited here',
          variant: 'default'
        });
        setEditingParent(null);
        return;
      }

      const { error } = await supabase
        .from('parents')
        .update({
          name: updatedData.name.trim(),
          email: updatedData.email.trim(),
          phone: updatedData.phone.trim() || null
        })
        .eq('id', parentId);

      if (error) throw error;

      setParents(prev => prev.map(p => 
        p.id === parentId 
          ? { ...p, name: updatedData.name, email: updatedData.email, phone: updatedData.phone }
          : p
      ));
      setEditingParent(null);
      
      toast({
        title: 'Success',
        description: 'Parent updated successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update parent',
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
      if (parent.isLinked && parent.userId) {
        // Remove linked parent
        await playersService.removeLinkedParent(player.id, parent.userId);
      } else {
        // Remove regular parent
        const { error } = await supabase
          .from('parents')
          .delete()
          .eq('id', parentId);

        if (error) throw error;
      }

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
          invitationCode: parent.linkCode
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
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Parents
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{player.name}</p>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
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
              {parents.map(parent => {
                const isEditing = editingParent === parent.id;

                return (
                  <Card key={parent.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {isEditing ? (
                            <Input
                              value={editData.name}
                              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                              className="text-sm font-medium"
                            />
                          ) : (
                            <CardTitle className="text-sm">{parent.name}</CardTitle>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateParent(parent.id, editData)}
                                disabled={saving}
                              >
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingParent(null);
                                  setEditData({ name: '', email: '', phone: '' });
                                }}
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {!parent.isLinked && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingParent(parent.id);
                                    setEditData({ name: parent.name, email: parent.email, phone: parent.phone || '' });
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveParent(parent.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {isEditing ? (
                            <Input
                              type="email"
                              value={editData.email}
                              onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                              className="text-sm"
                            />
                          ) : (
                            <span className="text-sm">{parent.email}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {isEditing ? (
                            <Input
                              type="tel"
                              value={editData.phone}
                              onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="Phone number"
                              className="text-sm"
                            />
                          ) : (
                            <span className="text-sm">{parent.phone || 'No phone'}</span>
                          )}
                        </div>
                      </div>

                      {!isEditing && (
                        <>
                          {!parent.isLinked && (
                            <>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Link className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs font-medium">Link Code:</span>
                                  <Badge variant="outline" className="text-xs">
                                    {parent.linkCode}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyLinkCode(parent.linkCode)}
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
                            </>
                          )}
                          {parent.isLinked && (
                            <div className="mt-2">
                              <Badge variant="secondary" className="text-xs">
                                Linked Account
                              </Badge>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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
        </ScrollArea>

        <div className="border-t p-4">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
