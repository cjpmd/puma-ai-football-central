import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Player } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { History, Calendar, TrendingUp, Award, MessageSquare } from 'lucide-react';

interface PlayerHistoryModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
}

interface HistoryEvent {
  id: string;
  type: 'attribute' | 'objective' | 'comment' | 'transfer' | 'match' | 'general';
  title: string;
  description: string;
  date: string;
  author?: string;
  value?: number;
  category?: string;
}

export const PlayerHistoryModal: React.FC<PlayerHistoryModalProps> = ({
  player,
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadPlayerHistory();
    }
  }, [isOpen, player.id]);

  const loadPlayerHistory = async () => {
    try {
      setLoading(true);
      const events: HistoryEvent[] = [];

      // Load attribute history
      const { data: attributeHistory, error: attrError } = await supabase
        .from('player_attribute_history')
        .select('*')
        .eq('player_id', player.id)
        .order('recorded_date', { ascending: false });

      if (attrError) throw attrError;

      attributeHistory?.forEach(record => {
        events.push({
          id: record.id,
          type: 'attribute',
          title: `${record.attribute_name} Updated`,
          description: `${record.attribute_group} attribute set to ${record.value}`,
          date: record.recorded_date,
          value: record.value,
          category: record.attribute_group
        });
      });

      // Add recent match history from match stats
      const recentGames = player.matchStats?.recentGames || [];
      recentGames.forEach((game: any, index: number) => {
        events.push({
          id: `match-${game.id || index}`,
          type: 'match',
          title: `Match vs ${game.opponent || 'Unknown'}`,
          description: `Played ${game.minutes} minutes${game.captain ? ' as captain' : ''}${game.playerOfTheMatch ? ' - Player of the Match' : ''}`,
          date: game.date,
          category: game.performanceCategory
        });
      });

      // Add objectives history
      const objectives = player.objectives || [];
      objectives.forEach((obj: any) => {
        events.push({
          id: `objective-${obj.id}`,
          type: 'objective',
          title: `Objective: ${obj.title}`,
          description: `${obj.status} - ${obj.description}`,
          date: obj.createdAt,
          category: obj.category
        });
      });

      // Add comments history
      const comments = player.comments || [];
      comments.forEach((comment: any) => {
        events.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          title: `Comment by ${comment.author}`,
          description: comment.text,
          date: comment.createdAt,
          author: comment.author,
          category: comment.category
        });
      });

      // Add general milestones
      events.push({
        id: 'created',
        type: 'general',
        title: 'Player Added',
        description: `${player.name} was added to the team`,
        date: player.created_at || new Date().toISOString()
      });

      // Sort all events by date (newest first)
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistoryEvents(events);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load player history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'attribute': return <TrendingUp className="h-4 w-4" />;
      case 'objective': return <Award className="h-4 w-4" />;
      case 'comment': return <MessageSquare className="h-4 w-4" />;
      case 'match': return <Calendar className="h-4 w-4" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'attribute': return 'bg-blue-100 text-blue-800';
      case 'objective': return 'bg-green-100 text-green-800';
      case 'comment': return 'bg-purple-100 text-purple-800';
      case 'match': return 'bg-orange-100 text-orange-800';
      case 'transfer': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Player History</SheetTitle>
          <p className="text-sm text-muted-foreground">{player.name}</p>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading history...</p>
            </div>
          ) : historyEvents.length > 0 ? (
            <div className="space-y-4">
              {historyEvents.map(event => (
                <Card key={event.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getEventIcon(event.type)}
                        <CardTitle className="text-sm">{event.title}</CardTitle>
                        <Badge className={getEventColor(event.type)}>
                          {event.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{formatDate(event.date)}</div>
                        <div>{getRelativeTime(event.date)}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">{event.description}</p>
                    
                    <div className="flex items-center gap-2">
                      {event.category && (
                        <Badge variant="outline">{event.category}</Badge>
                      )}
                      {event.author && (
                        <Badge variant="secondary">by {event.author}</Badge>
                      )}
                      {event.value !== undefined && (
                        <Badge variant="outline">Value: {event.value}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No history events found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};