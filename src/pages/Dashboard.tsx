
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TeamOverview } from "@/components/dashboard/TeamOverview";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { PlayerList } from "@/components/dashboard/PlayerList";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { teams } = useAuth();
  
  const hasTeams = teams.length > 0;

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

        {hasTeams ? (
          <>
            <TeamOverview />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <UpcomingEvents />
              </div>
              <div className="md:col-span-1">
                <PlayerList />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Welcome to Team Manager!</h2>
            <p className="text-muted-foreground mb-6">
              To get started, create your first team by clicking the button below.
            </p>
            <button 
              onClick={() => navigate("/teams")}
              className="bg-puma-blue-500 hover:bg-puma-blue-600 text-white px-6 py-3 rounded-md font-medium"
            >
              Create Your First Team
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
