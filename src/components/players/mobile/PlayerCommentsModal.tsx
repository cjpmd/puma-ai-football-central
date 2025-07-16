import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player, PlayerComment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import { Plus, Trash2, MessageSquare } from 'lucide-react';

interface PlayerCommentsModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const PlayerCommentsModal: React.FC<PlayerCommentsModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave
}) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<PlayerComment[]>(player?.comments || []);
  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: PlayerComment = {
        id: `comment-${Date.now()}`,
        text: newComment,
        createdAt: new Date().toISOString(),
        createdBy: profile?.name || 'Current User'
      };
      
      setComments([...comments, comment]);
      setNewComment('');
    }
  };

  const handleRemoveComment = (id: string) => {
    setComments(comments.filter(comment => comment.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({
          comments: comments as any
        })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Player comments updated successfully'
      });
      
      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update comments',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Coach Comments - {player.name}
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Add New Comment */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <h3 className="font-medium">Add Comment</h3>
                  </div>
                  <div className="flex space-x-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a coaching comment..."
                      className="flex-1"
                      rows={3}
                    />
                    <Button 
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="self-end"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing Comments */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comment History
              </h3>
              
              {comments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <MessageSquare className="h-8 w-8" />
                      <p>No coaching comments have been added yet</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="pt-4 relative">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveComment(comment.id)}
                          className="absolute top-2 right-2 h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        
                        <div className="space-y-2 pr-8">
                          <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
                          <div className="text-xs text-muted-foreground">
                            Added by {comment.createdBy} on {formatDate(comment.createdAt, 'PPp')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="border-t p-4 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
