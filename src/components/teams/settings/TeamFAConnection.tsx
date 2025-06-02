
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Team } from '@/types/team';
import { Wifi, Upload, Download, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface TeamFAConnectionProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamFAConnection: React.FC<TeamFAConnectionProps> = ({
  team,
  onUpdate
}) => {
  const [faConnection, setFaConnection] = useState(
    team.faConnection || {
      provider: 'comet',
      isConnected: false,
      syncEnabled: false
    }
  );

  const [connectionSettings, setConnectionSettings] = useState({
    apiKey: '',
    organizationId: '',
    syncFixtures: true,
    syncPlayers: true,
    syncCoaches: true
  });

  const handleConnect = () => {
    // Mock connection process
    setFaConnection(prev => ({
      ...prev,
      isConnected: true,
      lastSync: new Date().toISOString()
    }));
    onUpdate({ faConnection: { ...faConnection, isConnected: true } });
  };

  const handleDisconnect = () => {
    setFaConnection(prev => ({
      ...prev,
      isConnected: false,
      syncEnabled: false,
      lastSync: undefined
    }));
    onUpdate({ faConnection: { ...faConnection, isConnected: false, syncEnabled: false } });
  };

  const handleSync = () => {
    // Mock sync process
    setFaConnection(prev => ({
      ...prev,
      lastSync: new Date().toISOString()
    }));
  };

  const getProviderInfo = (provider: string) => {
    switch (provider) {
      case 'comet':
        return { name: 'Comet FA', description: 'Connect to Comet Football Association system' };
      case 'matchday':
        return { name: 'MatchDay', description: 'Sync with MatchDay platform' };
      case 'fulltime':
        return { name: 'FullTime', description: 'Integration with FullTime system' };
      case 'playmetrix':
        return { name: 'Playmetrix', description: 'Connect to Playmetrix analytics' };
      case 'custom':
        return { name: 'Custom API', description: 'Custom FA integration' };
      default:
        return { name: provider, description: 'Regional FA system' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Regional FA Connection</h3>
          <p className="text-sm text-muted-foreground">
            Connect to your regional Football Association for data sync
          </p>
        </div>
        <Badge variant={faConnection.isConnected ? 'default' : 'secondary'}>
          {faConnection.isConnected ? (
            <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
          ) : (
            <><AlertCircle className="h-3 w-3 mr-1" /> Disconnected</>
          )}
        </Badge>
      </div>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>FA Provider</CardTitle>
          <CardDescription>
            Select your regional Football Association system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="faProvider">Provider</Label>
            <Select 
              value={faConnection.provider}
              onValueChange={(value) => setFaConnection(prev => ({ 
                ...prev, 
                provider: value
              }))}
            >
              <SelectTrigger id="faProvider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comet">Comet FA</SelectItem>
                <SelectItem value="matchday">MatchDay</SelectItem>
                <SelectItem value="fulltime">FullTime</SelectItem>
                <SelectItem value="playmetrix">Playmetrix</SelectItem>
                <SelectItem value="custom">Custom API</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>{getProviderInfo(faConnection.provider).name}</strong>
              <br />
              {getProviderInfo(faConnection.provider).description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Settings</CardTitle>
          <CardDescription>
            Configure your FA system connection details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key / Username</Label>
              <Input
                id="apiKey"
                type="password"
                value={connectionSettings.apiKey}
                onChange={(e) => setConnectionSettings(prev => ({ 
                  ...prev, 
                  apiKey: e.target.value 
                }))}
                placeholder="Enter API key or username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgId">Organization ID</Label>
              <Input
                id="orgId"
                value={connectionSettings.organizationId}
                onChange={(e) => setConnectionSettings(prev => ({ 
                  ...prev, 
                  organizationId: e.target.value 
                }))}
                placeholder="Enter organization ID"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Sync Options</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="syncFixtures">Sync Fixtures</Label>
                <Switch
                  id="syncFixtures"
                  checked={connectionSettings.syncFixtures}
                  onCheckedChange={(checked) => setConnectionSettings(prev => ({ 
                    ...prev, 
                    syncFixtures: checked 
                  }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncPlayers">Sync Player Data</Label>
                <Switch
                  id="syncPlayers"
                  checked={connectionSettings.syncPlayers}
                  onCheckedChange={(checked) => setConnectionSettings(prev => ({ 
                    ...prev, 
                    syncPlayers: checked 
                  }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncCoaches">Sync Coach Data</Label>
                <Switch
                  id="syncCoaches"
                  checked={connectionSettings.syncCoaches}
                  onCheckedChange={(checked) => setConnectionSettings(prev => ({ 
                    ...prev, 
                    syncCoaches: checked 
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!faConnection.isConnected ? (
              <Button onClick={handleConnect} className="bg-puma-blue-500 hover:bg-puma-blue-600">
                <Wifi className="h-4 w-4 mr-2" />
                Connect to FA
              </Button>
            ) : (
              <>
                <Button onClick={handleSync} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
                <Button onClick={handleDisconnect} variant="outline" className="text-red-600">
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      {faConnection.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Sync:</span>
                <span className="text-sm font-medium">
                  {faConnection.lastSync ? 
                    new Date(faConnection.lastSync).toLocaleString() : 
                    'Never'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Auto Sync:</span>
                <Switch
                  checked={faConnection.syncEnabled || false}
                  onCheckedChange={(checked) => {
                    setFaConnection(prev => ({ ...prev, syncEnabled: checked }));
                    onUpdate({ faConnection: { ...faConnection, syncEnabled: checked } });
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
