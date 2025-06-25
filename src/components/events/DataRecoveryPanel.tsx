import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, RefreshCw, CheckCircle, AlertTriangle, Copy, Calendar, Users, Database } from 'lucide-react';
import { 
  comprehensiveDataCheck, 
  restoreEventSelections, 
  createSelectionsFromTemplate,
  type DataRecoveryResults 
} from '@/utils/dataRecovery';
import { recoverTeamSelectionFromStats } from '@/utils/teamSelectionRecovery';
import { toast } from 'sonner';

export const DataRecoveryPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('3 tiers Dundee West Royals');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<DataRecoveryResults | null>(null);

  const handleComprehensiveSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const results = await comprehensiveDataCheck(searchTerm);
      setSearchResults(results);
      
      if (results.event) {
        toast.success(`Found event: ${results.event.title}`);
        if (results.selections.length === 0) {
          toast.warning('No player selections found for this event');
        }
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

  const handleRestoreFromTemplate = async (templateSelection: any) => {
    if (!searchResults?.event) {
      toast.error('No target event selected');
      return;
    }

    setLoading(true);
    try {
      await createSelectionsFromTemplate(searchResults.event.id, [templateSelection]);
      toast.success('Selection created from template!');
      // Refresh the search to show updated data
      handleComprehensiveSearch();
    } catch (error) {
      console.error('Template restore error:', error);
      toast.error('Error creating selection from template');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverFromStats = async () => {
    if (!searchResults?.event) {
      toast.error('No target event selected');
      return;
    }

    setLoading(true);
    try {
      const result = await recoverTeamSelectionFromStats(searchResults.event.id);
      toast.success(`${result.message} - ${result.playersRecovered} players recovered`);
      
      // Refresh the search to show updated data
      setTimeout(() => {
        handleComprehensiveSearch();
      }, 1000);
      
    } catch (error) {
      console.error('Recovery from stats error:', error);
      toast.error(`Failed to recover from stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const renderSelectionSummary = (selection: any, isTemplate = false) => {
    const playerCount = Array.isArray(selection.player_positions) 
      ? selection.player_positions.length 
      : (selection.player_positions ? Object.keys(selection.player_positions).length : 0);
    const substituteCount = Array.isArray(selection.substitute_players) 
      ? selection.substitute_players.length 
      : (selection.substitute_players ? Object.keys(selection.substitute_players).length : 0);
    
    return (
      <div key={selection.id} className="p-3 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">
            Team {selection.team_number} - Period {selection.period_number}
            {isTemplate && (
              <Badge variant="outline" className="ml-2">Template</Badge>
            )}
          </h4>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{selection.formation}</Badge>
            {isTemplate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRestoreFromTemplate(selection)}
                disabled={loading}
              >
                <Copy className="h-3 w-3 mr-1" />
                Use as Template
              </Button>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Players: {playerCount}</div>
          <div>Substitutes: {substituteCount}</div>
          <div>Duration: {selection.duration_minutes} minutes</div>
          {selection.captain_id && <div>Captain selected: Yes</div>}
          <div className="text-xs">
            Created: {new Date(selection.created_at).toLocaleString()}
          </div>
          {isTemplate && selection.events && (
            <div className="text-xs">
              From: {selection.events.title} ({selection.events.date})
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Event Data Recovery & Investigation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Search for lost event data, investigate recent activity, and recover selections
        </p>
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
              onKeyDown={(e) => e.key === 'Enter' && handleComprehensiveSearch()}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleComprehensiveSearch} 
              disabled={loading || !searchTerm.trim()}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Investigate
            </Button>
          </div>
        </div>

        {searchResults && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="selections">Current Selections</TabsTrigger>
              <TabsTrigger value="recovery">Stats Recovery</TabsTrigger>
              <TabsTrigger value="recent">Recent Activity</TabsTrigger>
              <TabsTrigger value="templates">Recovery Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
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
                      <div><strong>Title:</strong> {searchResults.event.title}</div>
                      <div><strong>Date:</strong> {searchResults.event.date}</div>
                      <div><strong>Type:</strong> {searchResults.event.event_type}</div>
                      <div><strong>Location:</strong> {searchResults.event.location || 'Not specified'}</div>
                      <div><strong>Selections Found:</strong> {searchResults.selections.length}</div>
                      <div><strong>Player Stats:</strong> {searchResults.playerStats.length}</div>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Investigation Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Event exists:</span>
                    <Badge variant={searchResults.event ? "default" : "destructive"}>
                      {searchResults.event ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Player selections:</span>
                    <Badge variant={searchResults.selections.length > 0 ? "default" : "destructive"}>
                      {searchResults.selections.length} found
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Player stats:</span>
                    <Badge variant={searchResults.playerStats.length > 0 ? "default" : "secondary"}>
                      {searchResults.playerStats.length} found
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Recent team activity:</span>
                    <Badge variant={searchResults.recentSelections.length > 0 ? "default" : "secondary"}>
                      {searchResults.recentSelections.length} selections (7 days)
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="selections" className="space-y-4">
              {searchResults.selections.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Current Event Selections ({searchResults.selections.length})
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
                        {searchResults.selections.map(selection => renderSelectionSummary(selection))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center gap-2 text-muted-foreground p-4">
                    <AlertTriangle className="h-5 w-5" />
                    No player selections found for this event
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recovery" className="space-y-4">
              {searchResults.playerStats.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-blue-500" />
                        Recover from Player Stats ({searchResults.playerStats.length} records)
                      </span>
                      <Button 
                        onClick={handleRecoverFromStats}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                        Recover from Stats
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>
                        Found {searchResults.playerStats.length} player statistics records for this event.
                        This recovery method will reconstruct team selections from the existing player stats data.
                      </p>
                      <p className="font-medium">Recovery process:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs ml-4">
                        <li>Extract player positions from event_player_stats table</li>
                        <li>Group players by team and period</li>
                        <li>Identify captain and substitute players</li>
                        <li>Determine formation based on positions</li>
                        <li>Create new event_selections records</li>
                      </ul>
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800">
                          <strong>Note:</strong> This will overwrite any existing team selections for this event.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center gap-2 text-muted-foreground p-4">
                    <AlertTriangle className="h-5 w-5" />
                    No player stats found for recovery
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recent" className="space-y-4">
              {searchResults.recentSelections.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Recent Team Activity (Last 7 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {searchResults.recentSelections.map(selection => renderSelectionSummary(selection))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center gap-2 text-muted-foreground p-4">
                    <AlertTriangle className="h-5 w-5" />
                    No recent team selections found
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              {searchResults.recentSelections.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Recovery Templates
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Use recent selections as templates to recreate your lost data
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {searchResults.recentSelections.map(selection => 
                          renderSelectionSummary(selection, true)
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center gap-2 text-muted-foreground p-4">
                    <AlertTriangle className="h-5 w-5" />
                    No recovery templates available
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
