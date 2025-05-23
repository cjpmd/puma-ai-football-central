
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Team } from '@/types/team';
import { Upload, Shirt } from 'lucide-react';

interface TeamKitSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamKitSettings: React.FC<TeamKitSettingsProps> = ({
  team,
  onUpdate
}) => {
  const [kitIcons, setKitIcons] = useState(
    team.kitIcons || {
      home: '',
      away: '',
      training: '',
      goalkeeper: ''
    }
  );

  const handleFileUpload = (kitType: keyof typeof kitIcons, file: File) => {
    // Mock file upload - would upload to storage in real implementation
    const mockUrl = URL.createObjectURL(file);
    setKitIcons(prev => ({ ...prev, [kitType]: mockUrl }));
  };

  const handleSave = () => {
    onUpdate({ kitIcons });
  };

  const kitTypes = [
    { key: 'home' as const, label: 'Home Kit', color: 'bg-blue-500' },
    { key: 'away' as const, label: 'Away Kit', color: 'bg-red-500' },
    { key: 'training' as const, label: 'Training Kit', color: 'bg-green-500' },
    { key: 'goalkeeper' as const, label: 'Goalkeeper Kit', color: 'bg-yellow-500' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Kit Icons</h3>
          <p className="text-sm text-muted-foreground">
            Upload custom icons for your team's different kits
          </p>
        </div>
        <Button onClick={handleSave} className="bg-puma-blue-500 hover:bg-puma-blue-600">
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kitTypes.map((kit) => (
          <Card key={kit.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${kit.color}`} />
                {kit.label}
              </CardTitle>
              <CardDescription>
                Upload an icon for your {kit.label.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <div className="w-24 h-24 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center bg-muted">
                  {kitIcons[kit.key] ? (
                    <img 
                      src={kitIcons[kit.key]} 
                      alt={kit.label}
                      className="w-20 h-20 object-contain"
                    />
                  ) : (
                    <Shirt className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`kit-${kit.key}`}>Upload Icon</Label>
                <Input
                  id={`kit-${kit.key}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(kit.key, file);
                    }
                  }}
                />
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      handleFileUpload(kit.key, file);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kit Icon Preview</CardTitle>
          <CardDescription>
            Preview of how your kit icons will appear in the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center gap-4">
            {kitTypes.map((kit) => (
              <div key={kit.key} className="text-center">
                <div className="w-12 h-12 border rounded flex items-center justify-center bg-muted mb-2">
                  {kitIcons[kit.key] ? (
                    <img 
                      src={kitIcons[kit.key]} 
                      alt={kit.label}
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <Shirt className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{kit.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
