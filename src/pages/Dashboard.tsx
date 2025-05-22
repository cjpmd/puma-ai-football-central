
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TeamOverview } from "@/components/dashboard/TeamOverview";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { PlayerList } from "@/components/dashboard/PlayerList";
import { Player } from "@/types";

const Dashboard = () => {
  // Mock data for players
  const mockPlayers: Partial<Player>[] = [
    {
      id: "1",
      name: "Jack Smith",
      type: "outfield",
      squadNumber: 7,
      availability: "green",
      subscriptionStatus: "active",
      subscriptionType: "full_squad",
    },
    {
      id: "2",
      name: "Tom Williams",
      type: "outfield",
      squadNumber: 11,
      availability: "amber",
      subscriptionStatus: "active",
      subscriptionType: "full_squad",
    },
    {
      id: "3",
      name: "Lucas Davis",
      type: "outfield",
      squadNumber: 8,
      availability: "green",
      subscriptionStatus: "active",
      subscriptionType: "full_squad",
    },
    {
      id: "4",
      name: "Ryan Johnson",
      type: "goalkeeper",
      squadNumber: 1,
      availability: "green",
      subscriptionStatus: "active",
      subscriptionType: "full_squad",
    },
    {
      id: "5",
      name: "Max Cooper",
      type: "outfield",
      squadNumber: 10,
      availability: "red",
      subscriptionStatus: "inactive",
      subscriptionType: "training",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back to your team dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Subscription: Analytics+
            </div>
          </div>
        </div>

        <TeamOverview />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <UpcomingEvents />
          </div>
          <div className="md:col-span-1">
            <PlayerList players={mockPlayers} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
