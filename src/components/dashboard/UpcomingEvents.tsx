
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function UpcomingEvents() {
  const events = [
    {
      id: "1",
      title: "Match vs Eagles FC",
      type: "fixture",
      date: "2023-06-15",
      time: "10:00 AM",
      location: "Central Park Pitch",
      isHome: true,
      gameFormat: "7-a-side",
      confirmed: 14,
      total: 18,
    },
    {
      id: "2",
      title: "Training Session",
      type: "training",
      date: "2023-06-12",
      time: "6:00 PM",
      location: "Training Ground",
      confirmed: 16,
      total: 18,
    },
    {
      id: "3",
      title: "Summer Tournament",
      type: "tournament",
      date: "2023-06-22",
      time: "9:00 AM",
      location: "City Sports Complex",
      gameFormat: "7-a-side",
      confirmed: 15,
      total: 18,
    },
  ];

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "fixture":
        return "bg-blue-100 text-blue-800";
      case "friendly":
        return "bg-green-100 text-green-800";
      case "tournament":
        return "bg-purple-100 text-purple-800";
      case "festival":
        return "bg-yellow-100 text-yellow-800";
      case "training":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Upcoming Events</h2>
        <Button size="sm">View All</Button>
      </div>
      
      <div className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{event.title}</CardTitle>
                  <CardDescription>
                    {formatDate(event.date)} • {event.time}
                  </CardDescription>
                </div>
                <Badge variant="outline" className={getEventTypeColor(event.type)}>
                  {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p className="text-sm">{event.location}</p>
                </div>
                {event.gameFormat && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Format</p>
                    <p className="text-sm">{event.gameFormat}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Attendance</p>
                  <div className="flex items-center mt-1">
                    <div className="flex -space-x-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Avatar key={i} className="h-6 w-6 border-2 border-white">
                          <AvatarFallback className="text-[10px] bg-puma-blue-100 text-puma-blue-500">
                            {String.fromCharCode(65 + i)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {event.confirmed}/{event.total} confirmed
                    </span>
                  </div>
                </div>
                {event.isHome !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Venue</p>
                    <p className="text-sm">{event.isHome ? "Home" : "Away"}</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
              <Button variant="outline" size="sm">
                Manage Squad
              </Button>
              <Button size="sm">
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
