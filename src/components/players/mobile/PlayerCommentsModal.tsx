import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Player } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, MessageSquare } from 'lucide-react';

interface PlayerCommentsModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  authorId: string;
  category: string;
  createdAt: string;
  isPrivate: boolean;
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
  const [comments, setComments] = useState<Comment[]>(
    player.comments || []
  );
  const [newComment, setNewComment] = useState({
    text: '',
    category: 'General',
    isPrivate: false
  });

  const categories = ['General', 'Performance', 'Behavior', 'Development', 'Injury'];

  const handleAddComment = () => {
    if (!newComment.text.trim()) {
      toast({
        title: 'Error',
        description: 'Comment text is required',
        variant: 'destructive'
      });
      return;
    }

    const comment: Comment = {
      id: Date.now().toString(),
      text: newComment.text.trim(),
      author: profile?.name || 'Unknown',
      authorId: profile?.id || '',
      category: newComment.category,
      createdAt: new Date().toISOString(),
      isPrivate: newComment.isPrivate
    };

    setComments(prev => [comment, ...prev]);
    setNewComment({ text: '', category: 'General', isPrivate: false });
  };

  const handleRemoveComment = (id: string) => {
    setComments(prev => prev.filter(comment => comment.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({
          comments: comments
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Performance': return 'bg-blue-100 text-blue-800';
      case 'Behavior': return 'bg-green-100 text-green-800';
      case 'Development': return 'bg-purple-100 text-purple-800';
      case 'Injury': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Player Comments</SheetTitle>
          <p className="text-sm text-muted-foreground">{player.name}</p>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add New Comment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Add New Comment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={newComment.text}
                  onChange={(e) => setNewComment(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Enter your comment..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={newComment.category}
                    onChange={(e) => setNewComment(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visibility</label>
                  <select
                    value={newComment.isPrivate ? 'private' : 'team'}
                    onChange={(e) => setNewComment(prev => ({ ...prev, isPrivate: e.target.value === 'private' }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="team">Team Visible</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleAddComment} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Comment
              </Button>
            </CardContent>
          </Card>

          {/* Existing Comments */}
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map(comment => (
                <Card key={comment.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {comment.authorId === profile?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveComment(comment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{comment.text}</p>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(comment.category)}>
                        {comment.category}
                      </Badge>
                      {comment.isPrivate && (
                        <Badge variant="secondary">Private</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No comments added yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="border-t p-6 flex gap-3">
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
