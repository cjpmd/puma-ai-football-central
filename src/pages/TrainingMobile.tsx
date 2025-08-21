import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DrillLibraryManager } from '@/components/training/DrillLibraryManager';
import { DrillCreator } from '@/components/training/DrillCreator';
import { Plus, BookOpen, Dumbbell } from 'lucide-react';

export default function TrainingMobile() {
  const [activeTab, setActiveTab] = useState('library');
  const [showCreateDrill, setShowCreateDrill] = useState(false);

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Training</h1>
        <p className="text-sm text-muted-foreground">
          Manage drills and training sessions
        </p>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreateDrill(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Drill
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="library" className="text-xs">
            <BookOpen className="w-4 h-4 mr-1" />
            Library
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs">
            <Dumbbell className="w-4 h-4 mr-1" />
            Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Drill Library</CardTitle>
              <CardDescription className="text-sm">
                Manage your training drills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DrillLibraryManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Training Sessions</CardTitle>
              <CardDescription className="text-sm">
                Manage training sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <Dumbbell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-2 text-sm">Training Sessions</h3>
                <p className="text-muted-foreground mb-4 text-xs">
                  Sessions are managed in events on the Calendar page.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/calendar">Go to Calendar</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showCreateDrill && (
        <DrillCreator 
          open={showCreateDrill} 
          onOpenChange={setShowCreateDrill}
        />
      )}
    </div>
  );
}