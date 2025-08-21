import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DrillLibraryManager } from '@/components/training/DrillLibraryManager';
import { DrillCreator } from '@/components/training/DrillCreator';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, BookOpen, Dumbbell } from 'lucide-react';

export default function Training() {
  const [activeTab, setActiveTab] = useState('library');
  const [showCreateDrill, setShowCreateDrill] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Training Management</h1>
            <p className="text-muted-foreground">
              Manage your drill library and create training sessions
            </p>
          </div>
          <Button onClick={() => setShowCreateDrill(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Drill
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Drill Library
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Training Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Drill Library</CardTitle>
                <CardDescription>
                  Manage your collection of training drills that can be used across different training sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DrillLibraryManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Training Sessions</CardTitle>
                <CardDescription>
                  View and manage past and upcoming training sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Training Sessions</h3>
                  <p className="text-muted-foreground mb-4">
                    Training sessions are managed within individual events on the Calendar page.
                  </p>
                  <Button variant="outline" asChild>
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
    </DashboardLayout>
  );
}