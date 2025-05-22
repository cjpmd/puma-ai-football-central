
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock } from "lucide-react";

export function TeamOverview() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">18</div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              +2 since last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">5</div>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Next: Match vs Eagles FC (Sat)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Training Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">24</div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This month (12 sessions)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Next Event</CardTitle>
            <CardDescription>Sat, Jun 15 • 10:00 AM</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-puma-blue-50 p-2 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-puma-blue-500"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">Match vs Eagles FC</h3>
                    <p className="text-sm text-muted-foreground">Home • 7-a-side</p>
                  </div>
                </div>
                <Button size="sm">View Details</Button>
              </div>
              
              <div className="pt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meeting Time</span>
                  <span className="font-medium">9:15 AM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">Central Park Pitch</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Player Availability</span>
                  <span className="font-medium">14/18 Confirmed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Recent Players</CardTitle>
            <CardDescription>New players and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">JS</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <div className="font-medium">Jack Smith</div>
                  <div className="text-xs text-muted-foreground">Added 2 days ago</div>
                </div>
                <div className="ml-auto text-xs bg-puma-green-100 text-puma-green-600 px-2 py-1 rounded-full">
                  New
                </div>
              </div>
              
              <div className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">TW</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <div className="font-medium">Tom Williams</div>
                  <div className="text-xs text-muted-foreground">Profile updated</div>
                </div>
                <div className="ml-auto text-xs bg-puma-blue-100 text-puma-blue-600 px-2 py-1 rounded-full">
                  Updated
                </div>
              </div>
              
              <div className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">LD</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <div className="font-medium">Lucas Davis</div>
                  <div className="text-xs text-muted-foreground">Added 1 week ago</div>
                </div>
                <div className="ml-auto text-xs bg-puma-green-100 text-puma-green-600 px-2 py-1 rounded-full">
                  New
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
