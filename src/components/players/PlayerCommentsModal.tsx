
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Player, PlayerComment } from '@/types';
import { formatDate } from '@/lib/utils';
import { PlusCircle, Trash } from 'lucide-react';

interface PlayerCommentsModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: (comments: PlayerComment[]) => void;
}

export const PlayerCommentsModal: React.FC<PlayerCommentsModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave
}) => {
  const [comments, setComments] = useState<PlayerComment[]>(player.comments || []);
  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: PlayerComment = {
        id: `comment-${Date.now()}`,
        text: newComment,
        createdAt: new Date().toISOString(),
        createdBy: 'Current User' // This would be replaced with actual user name
      };
      
      setComments([...comments, comment]);
      setNewComment('');
    }
  };

  const handleRemoveComment = (id: string) => {
    setComments(comments.filter(comment => comment.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Coach Comments - {player.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div>
            <Label htmlFor="newComment" className="text-lg font-medium">Add Comment</Label>
            <div className="flex space-x-2 mt-2">
              <Textarea
                id="newComment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a coaching comment..."
                className="flex-1"
                rows={3}
              />
              <Button 
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="bg-puma-blue-500 hover:bg-puma-blue-600 self-end"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Comment History</h3>
            
            {comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No coaching comments have been added yet.
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="pt-6 relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveComment(comment.id)}
                        className="absolute top-2 right-2 h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                      
                      <p className="whitespace-pre-wrap">{comment.text}</p>
                      
                      <div className="mt-2 text-sm text-muted-foreground">
                        Added by {comment.createdBy} on {formatDate(comment.createdAt, 'PPp')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(comments)} className="bg-puma-blue-500 hover:bg-puma-blue-600">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
