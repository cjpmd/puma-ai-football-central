
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Shirt, Settings } from 'lucide-react';
import { Team } from '@/types/team';
import { KitManagementModal } from '../KitManagementModal';

interface TeamKitManagementSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamKitManagementSettings: React.FC<TeamKitManagementSettingsProps> = ({
  team,
  onUpdate
}) => {
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Kit Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage kit issued to players and track kit sizes
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Kit Issue Tracking
            </CardTitle>
            <CardDescription>
              Track which kit items have been issued to players and when
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setIsKitModalOpen(true)}
              className="bg-puma-blue-500 hover:bg-puma-blue-600"
            >
              <Package className="h-4 w-4 mr-2" />
              Manage Kit Issues
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Kit Icons & Designs
            </CardTitle>
            <CardDescription>
              Upload custom kit designs and icons for different kit types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Kit icon settings are available in the "Kit Icons" tab
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Kit Size Configuration
            </CardTitle>
            <CardDescription>
              Configure available sizes for different kit items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Clothing Sizes:</h4>
                  <p className="text-muted-foreground">3XS, 2XS, XS, S, M, L, XL, 2XL, 3XL</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Boot Sizes:</h4>
                  <p className="text-muted-foreground">UK 3, UK 4, UK 5, UK 6, UK 7, UK 8, UK 9, UK 10, UK 11, UK 12</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Size configurations are managed centrally. Players can specify their kit sizes in their profiles.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <KitManagementModal
        team={team}
        isOpen={isKitModalOpen}
        onClose={() => setIsKitModalOpen(false)}
      />
    </div>
  );
};
