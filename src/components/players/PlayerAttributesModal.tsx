
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Player, PlayerAttribute } from '@/types';
import { toast } from 'sonner';

interface PlayerAttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onSave?: (attributes: PlayerAttribute[]) => void;
}

export const PlayerAttributesModal: React.FC<PlayerAttributesModalProps> = ({
  isOpen,
  onClose,
  player,
  onSave
}) => {
  const [attributes, setAttributes] = useState<PlayerAttribute[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && player) {
      // Load player attributes
      setAttributes(player.attributes as PlayerAttribute[] || []);
    }
  }, [isOpen, player]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save attributes logic would go here
      onSave?.(attributes);
      toast.success('Attributes saved successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to save attributes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Player Attributes - {player?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {attributes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No attributes recorded yet</p>
              </CardContent>
            </Card>
          ) : (
            attributes.map((attribute, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-sm">{attribute.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Group: {attribute.group}</p>
                  <p>Value: {attribute.value}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
