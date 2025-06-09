import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Player, Parent } from '@/types';
import { playersService } from '@/services/playersService';
import { UserInvitationModal } from '@/components/users/UserInvitationModal';
import { toast } from 'sonner';
import { Users, Mail, Plus, Edit, Trash2 } from 'lucide-react';

interface EnhancedPlayerParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onUpdate: () => void;
}

export const EnhancedPlayerParentModal: React.FC<EnhancedPlayerParentModalProps> = ({
  isOpen,
  onClose,
  player,
  onUpdate
}) => {
  const [parents, setParents] = useState<Parent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subscriptionType: 'full_squad' as 'full_squad' | 'training' | 'trialist'
  });

  useEffect(() => {
    if (isOpen && player.id) {
      loadParents();
    }
  }, [isOpen, player.id]);

  const loadParents = async () => {
    try {
      setIsLoading(true);
      const parentData = await playersService.getParentsByPlayerId(player.id);
      setParents(parentData);
    } catch (error) {
      console.error('Error loading parents:', error);
      toast.error('Failed to load parent information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await playersService.createParent({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        playerId: player.id,
        subscriptionType: formData.subscriptionType,
        subscriptionStatus: 'pending'
      });
      
      toast.success('Parent added successfully');
      setFormData({ name: '', email: '', phone: '', subscriptionType: 'full_squad' });
      setShowAddForm(false);
      loadParents();
      onUpdate();
    } catch (error) {
      console.error('Error adding parent:', error);
      toast.error('Failed to add parent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteParent = async (parentId: string) => {
    if (!confirm('Are you sure you want to remove this parent?')) return;
    
    try {
      setIsLoading(true);
      await playersService.deleteParent(parentId);
      toast.success('Parent removed successfully');
      loadParents();
      onUpdate();
    } catch (error) {
      console.error('Error deleting parent:', error);
      toast.error('Failed to remove parent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteParent = () => {
    setShowInviteModal(true);
  };

  const handleInviteSent = () => {
    toast.success('Invitation sent successfully!');
    loadParents();
    onUpdate();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parent Management - {player.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Existing Parents */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Current Parents</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInviteParent}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Invite Parent
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-4">Loading parents...</div>
              ) : parents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No parents added yet</p>
                  <p className="text-sm">Add a parent or send an invitation to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {parents.map((parent) => (
                    <div key={parent.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{parent.name}</h4>
                          <p className="text-sm text-muted-foreground">{parent.email}</p>
                          {parent.phone && (
                            <p className="text-sm text-muted-foreground">{parent.phone}</p>
                          )}
                          <div className="mt-2 flex gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {parent.subscriptionType?.replace('_', ' ') || 'Full Squad'}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              parent.subscriptionStatus === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : parent.subscriptionStatus === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {parent.subscriptionStatus || 'Pending'}
                            </span>
                          </div>
                          {parent.linkCode && (
                            <div className="mt-2">
                              <span className="text-xs text-muted-foreground">
                                Link Code: <code className="bg-gray-100 px-1 rounded">{parent.linkCode}</code>
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingParent(parent)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteParent(parent.id)}
                            className="h-8 w-8 p-0 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Add New Parent Form */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add New Parent</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {showAddForm ? 'Cancel' : 'Add Parent'}
                </Button>
              </div>

              {showAddForm && (
                <form onSubmit={handleAddParent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parentName">Name</Label>
                      <Input
                        id="parentName"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Parent's full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentEmail">Email</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="parent@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentPhone">Phone (Optional)</Label>
                      <Input
                        id="parentPhone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subscriptionType">Subscription Type</Label>
                      <Select
                        value={formData.subscriptionType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, subscriptionType: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_squad">Full Squad</SelectItem>
                          <SelectItem value="training">Training Only</SelectItem>
                          <SelectItem value="trialist">Trialist (Free)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      Add Parent
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Invitation Modal */}
      <UserInvitationModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={handleInviteSent}
        prefilledData={{
          teamId: player.teamId,
          playerId: player.id
        }}
      />
    </>
  );
};
