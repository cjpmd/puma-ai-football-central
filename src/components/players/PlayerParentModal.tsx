
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Player, Parent } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { playersService } from '@/services/playersService';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Copy, User, X, Edit, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PlayerParentModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerParentModal: React.FC<PlayerParentModalProps> = ({
  player,
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingParent, setEditingParent] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name: string; email: string; phone: string }>({
    name: '',
    email: '',
    phone: ''
  });
  const [formData, setFormData] = useState<Partial<Parent>>({
    name: '',
    email: '',
    phone: '',
    playerId: player?.id || '',
    subscriptionType: player?.subscriptionType || 'full_squad',
    subscriptionStatus: 'active'
  });

  // Only fetch parents if we have a valid player
  const { data: parents = [], isLoading, refetch } = useQuery({
    queryKey: ['parents', player?.id],
    queryFn: () => player?.id ? playersService.getParentsByPlayerId(player.id) : Promise.resolve([]),
    enabled: isOpen && !!player?.id,
  });

  // Mutations
  const createParentMutation = useMutation({
    mutationFn: playersService.createParent,
    onSuccess: () => {
      if (player?.id) {
        queryClient.invalidateQueries({ queryKey: ['parents', player.id] });
      }
      setShowAddForm(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        playerId: player?.id || '',
        subscriptionType: player?.subscriptionType || 'full_squad',
        subscriptionStatus: 'active'
      });
      toast({
        title: 'Parent Added',
        description: 'Parent has been successfully added to the player.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add parent',
        variant: 'destructive',
      });
    },
  });

  const updateParentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Parent> }) => 
      playersService.updateParent(id, data),
    onSuccess: () => {
      if (player?.id) {
        queryClient.invalidateQueries({ queryKey: ['parents', player.id] });
      }
      setEditingParent(null);
      toast({
        title: 'Parent Updated',
        description: 'Parent details have been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update parent',
        variant: 'destructive',
      });
    },
  });

  const updateLinkedParentMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: { name: string; email: string; phone: string } }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone
        })
        .eq('id', userId);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (player?.id) {
        queryClient.invalidateQueries({ queryKey: ['parents', player.id] });
      }
      setEditingParent(null);
      toast({
        title: 'Linked Parent Updated',
        description: 'The linked parent\'s profile has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update linked parent profile',
        variant: 'destructive',
      });
    },
  });

  const deleteParentMutation = useMutation({
    mutationFn: playersService.deleteParent,
    onSuccess: () => {
      if (player?.id) {
        queryClient.invalidateQueries({ queryKey: ['parents', player.id] });
      }
      toast({
        title: 'Parent Removed',
        description: 'Parent has been removed from the player.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove parent',
        variant: 'destructive',
      });
    },
  });

  const regenerateLinkCodeMutation = useMutation({
    mutationFn: playersService.regenerateParentLinkCode,
    onSuccess: (linkCode) => {
      if (player?.id) {
        queryClient.invalidateQueries({ queryKey: ['parents', player.id] });
      }
      toast({
        title: 'Link Code Regenerated',
        description: `New link code: ${linkCode}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate link code',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && player?.id) {
      createParentMutation.mutate({
        ...formData,
        playerId: player.id
      });
    }
  };

  const handleDelete = (parentId: string) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent) return;

    // Don't allow deletion of linked parents
    if (parentId.startsWith('linked_') || parent.isLinked) {
      toast({
        title: 'Cannot Delete',
        description: 'Linked parent accounts cannot be deleted from here. They must unlink themselves from their account.',
        variant: 'default'
      });
      return;
    }

    if (window.confirm('Are you sure you want to remove this parent?')) {
      deleteParentMutation.mutate(parentId);
    }
  };

  const handleUpdateParent = (parentId: string) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent) return;

    // Handle linked parents differently - update their user profile
    if (parentId.startsWith('linked_') || parent.isLinked) {
      const userId = parentId.startsWith('linked_') ? parentId.replace('linked_', '') : parent.userId;
      
      if (!userId) {
        toast({
          title: 'Error',
          description: 'Cannot find user ID for linked parent',
          variant: 'destructive'
        });
        setEditingParent(null);
        return;
      }

      updateLinkedParentMutation.mutate({ 
        userId, 
        data: { 
          name: editData.name, 
          email: editData.email, 
          phone: editData.phone 
        } 
      });
      return;
    }

    // Handle regular parents
    updateParentMutation.mutate({ 
      id: parentId, 
      data: { 
        name: editData.name, 
        email: editData.email, 
        phone: editData.phone 
      } 
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Link Code Copied',
      description: 'The link code has been copied to your clipboard.',
    });
  };

  // Reset the form when modal is closed or player changes
  useEffect(() => {
    if (!isOpen || !player) {
      setShowAddForm(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        playerId: player?.id || '',
        subscriptionType: player?.subscriptionType || 'full_squad',
        subscriptionStatus: 'active'
      });
    }
  }, [isOpen, player]);

  // Don't render the modal if there's no player
  if (!player) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Parent Management - {player.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="text-center py-8">Loading parents...</div>
          ) : (
            <div className="space-y-6">
              {parents.length === 0 && !showAddForm ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No parents have been added for this player yet.
                  </p>
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-puma-blue-500 hover:bg-puma-blue-600"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Parent
                  </Button>
                </div>
              ) : (
                <>
                  {!showAddForm && (
                    <div className="flex justify-end">
                      <Button 
                        onClick={() => setShowAddForm(true)}
                        className="bg-puma-blue-500 hover:bg-puma-blue-600"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Parent
                      </Button>
                    </div>
                  )}

                  {showAddForm && (
                    <Card>
                      <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              placeholder="Parent's name"
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              placeholder="parent@example.com"
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone (Optional)</Label>
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                              placeholder="Phone number"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="subscriptionType">Subscription Type</Label>
                            <Select 
                              value={formData.subscriptionType}
                              onValueChange={(value) => handleInputChange('subscriptionType', value)}
                            >
                              <SelectTrigger id="subscriptionType">
                                <SelectValue placeholder="Select subscription type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full_squad">Full Squad</SelectItem>
                                <SelectItem value="training">Training Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="subscriptionStatus">Subscription Status</Label>
                            <Select 
                              value={formData.subscriptionStatus}
                              onValueChange={(value) => handleInputChange('subscriptionStatus', value)}
                            >
                              <SelectTrigger id="subscriptionStatus">
                                <SelectValue placeholder="Select subscription status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                        
                        <CardFooter className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowAddForm(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            className="bg-puma-blue-500 hover:bg-puma-blue-600"
                          >
                            Add Parent
                          </Button>
                        </CardFooter>
                      </form>
                    </Card>
                  )}

                  {parents.map((parent) => {
                    const isEditing = editingParent === parent.id;
                    const isLinked = parent.isLinked || parent.id.startsWith('linked_');
                    
                    return (
                      <Card key={parent.id} className="relative">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              {isLinked && (
                                <div className="mb-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Linked Account
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUpdateParent(parent.id)}
                                    className="h-8 w-8 p-0 text-green-500 hover:text-green-700"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingParent(null);
                                      setEditData({ name: '', email: '', phone: '' });
                                    }}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingParent(parent.id);
                                      setEditData({ name: parent.name, email: parent.email, phone: parent.phone || '' });
                                    }}
                                    className="h-8 w-8 p-0"
                                    title={isLinked ? "Edit linked parent profile" : "Edit parent details"}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(parent.id)}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                    title={isLinked ? "Cannot delete linked account" : "Remove parent"}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {isLinked && isEditing && (
                              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-700">
                                  <strong>Note:</strong> Editing this linked parent will update their user profile across the entire system.
                                </p>
                              </div>
                            )}
                            
                            <div>
                              <Label className="text-sm text-muted-foreground">Name:</Label>
                              {isEditing ? (
                                <Input
                                  value={editData.name}
                                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                                  className="mt-1"
                                  placeholder="Parent's name"
                                />
                              ) : (
                                <div className="font-medium">{parent.name}</div>
                              )}
                            </div>
                            
                            <div>
                              <Label className="text-sm text-muted-foreground">Email:</Label>
                              {isEditing ? (
                                <Input
                                  type="email"
                                  value={editData.email}
                                  onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                                  className="mt-1"
                                  placeholder="parent@example.com"
                                />
                              ) : (
                                <div>{parent.email}</div>
                              )}
                            </div>
                            
                            <div>
                              <Label className="text-sm text-muted-foreground">Phone:</Label>
                              {isEditing ? (
                                <Input
                                  type="tel"
                                  value={editData.phone}
                                  onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                                  placeholder="Phone number"
                                  className="mt-1"
                                />
                              ) : (
                                <div>{parent.phone || 'No phone number'}</div>
                              )}
                            </div>
                            
                            {!isEditing && (
                              <>
                                <div>
                                  <Label className="text-sm text-muted-foreground">Subscription:</Label>
                                  <div>
                                    {parent.subscriptionType === 'full_squad' ? 'Full Squad' : 'Training Only'} 
                                    {' • '}
                                    <span className="capitalize">{parent.subscriptionStatus}</span>
                                  </div>
                                </div>
                                
                                {parent.linkCode && (
                                  <div>
                                    <Label className="text-sm text-muted-foreground">Link Code:</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                        {parent.linkCode}
                                      </code>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => copyToClipboard(parent.linkCode)}
                                        title="Copy link code"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </Button>
                                      {!isLinked && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs h-7"
                                          onClick={() => regenerateLinkCodeMutation.mutate(parent.id)}
                                          title="Generate new link code"
                                        >
                                          Regenerate
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
