
import { Header } from "./Header";
import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Building, CalendarDays, Home, PieChart, Settings, Users, UsersRound, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { teams, clubs } = useAuth();
  
  const hasTeams = teams.length > 0;
  const hasClubs = clubs.length > 0;

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <Home className="w-5 h-5" />,
      showAlways: true
    },
    {
      title: "Teams",
      href: "/teams",
      icon: <UsersRound className="w-5 h-5" />,
      showAlways: true
    },
    {
      title: "Players",
      href: "/players",
      icon: <UserRound className="w-5 h-5" />,
      show: hasTeams
    },
    {
      title: "Clubs",
      href: "/clubs",
      icon: <Building className="w-5 h-5" />,
      showAlways: true
    },
    {
      title: "Staff",
      href: "/staff",
      icon: <Users className="w-5 h-5" />,
      show: hasTeams || hasClubs
    },
    {
      title: "Calendar",
      href: "/calendar",
      icon: <CalendarDays className="w-5 h-5" />,
      show: hasTeams
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: <PieChart className="w-5 h-5" />,
      show: hasTeams
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="w-5 h-5" />,
      showAlways: true
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <aside className="hidden md:flex flex-col w-64 border-r bg-background">
          <nav className="flex-1 py-6 px-3">
            <ul className="space-y-1">
              {navItems.map((item) => {
                // Show the item if showAlways is true or if show is true
                const shouldShow = item.showAlways || item.show;
                
                if (!shouldShow) return null;
                
                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-puma-blue-50 text-puma-blue-500"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )
                      }
                    >
                      {item.icon}
                      {item.title}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
