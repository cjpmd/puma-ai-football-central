
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Player } from '@/types';
import { format } from 'date-fns';

interface PlayerLeaveFormProps {
  player: Player;
  onSubmit: (leaveDate: string, leaveComments?: string) => void;
  onCancel: () => void;
}

export const PlayerLeaveForm: React.FC<PlayerLeaveFormProps> = ({ player, onSubmit, onCancel }) => {
  const [leaveDate, setLeaveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [leaveComments, setLeaveComments] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(leaveDate, leaveComments);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <p className="text-muted-foreground">
        You are about to mark {player.name} as having left the team. This will move them to the "Previous Players" section.
      </p>

      <div className="space-y-2">
        <Label htmlFor="leaveDate">Leave Date</Label>
        <Input
          id="leaveDate"
          type="date"
          value={leaveDate}
          onChange={(e) => setLeaveDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="leaveComments">Comments (Optional)</Label>
        <Textarea
          id="leaveComments"
          placeholder="Add any comments about why the player is leaving..."
          value={leaveComments}
          onChange={(e) => setLeaveComments(e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive">
          Mark as Left Team
        </Button>
      </div>
    </form>
  );
};
