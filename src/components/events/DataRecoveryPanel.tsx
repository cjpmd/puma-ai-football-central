
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { checkEventSelections, restoreEventSelections, EventSelectionData } from '@/utils/dataRecovery';
import { toast } from 'sonner';

export const DataRecoveryPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('Messi Training . Ronaldo Game');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    event: any | null;
    selections: EventSelectionData[];
    playerStats: any[];
  } | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const results = await checkEventSelections(searchTerm);
      setSearchResults(results);
      
      if (results.event) {
        toast.success(`Found event: ${results.event.title}`);
      } else {
        toast.error('No event found with that title');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Error searching for event data');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!searchResults?.event || !searchResults.selections.length) {
      toast.error('No selections to restore');
      return;
    }

    setLoading(true);
    try {
      await restoreEventSelections(searchResults.event.id, searchResults.selections);
      toast.success('Event selections restored successfully!');
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Error restoring event selections');
    } finally {
      setLoading(false);
    }
  };

  const renderSelectionSummary = (selection: EventSelectionData) => {
    const playerCount = selection.player_positions?.length || 0;
    const substituteCount = selection.substitute_players?.length || 0;
    
    return (
      <div key={selection.id} className="p-3 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">
            Team {selection.team_number} - Period {selection.period_number}
          </h4>
          <Badge variant="outline">{selection.formation}</Badge>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Players: {playerCount}</div>
          <div>Substitutes: {substituteCount}</div>
          <div>Duration: {selection.duration_minutes} minutes</div>
          {selection.captain_id && <div>Captain selected: Yes</div>}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Event Data Recovery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="searchTerm">Event Title</Label>
            <Input
              id="searchTerm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter event title to search..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleSearch} 
              disabled={loading || !searchTerm.trim()}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
        </div>

        {searchResults && (
          <div className="space-y-4">
            {searchResults.event ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Event Found
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Title:</strong> {searchResults.event.title}
                    </div>
                    <div>
                      <strong>Date:</strong> {searchResults.event.date}
                    </div>
                    <div>
                      <strong>Type:</strong> {searchResults.event.event_type}
                    </div>
                    <div>
                      <strong>Location:</strong> {searchResults.event.location || 'Not specified'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center gap-2 text-muted-foreground p-4">
                  <AlertTriangle className="h-5 w-5" />
                  No event found with that title
                </CardContent>
              </Card>
            )}

            {searchResults.selections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Event Selections Found ({searchResults.selections.length})
                    </span>
                    <Button 
                      onClick={handleRestore}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Restore Selections
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {searchResults.selections.map(renderSelectionSummary)}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {searchResults.playerStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Player Stats Found ({searchResults.playerStats.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Player statistics are also available for this event.
                  </div>
                </CardContent>
              </Card>
            )}

            {searchResults.event && searchResults.selections.length === 0 && searchResults.playerStats.length === 0 && (
              <Card>
                <CardContent className="flex items-center gap-2 text-muted-foreground p-4">
                  <AlertTriangle className="h-5 w-5" />
                  Event found but no player selections or stats data available
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
