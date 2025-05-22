
import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Users, 
  Calendar, 
  BarChart, 
  Settings,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: "Squad",
      href: "/dashboard/squad",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Calendar",
      href: "/dashboard/calendar",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: "Analytics",
      href: "/dashboard/analytics",
      icon: <BarChart className="h-5 w-5" />,
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for mobile */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r lg:hidden transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-puma-blue-500"
            >
              <path d="M12 22c7.5 0 10-8 10-10a3.076 3.076 0 0 0-5.954-1" />
              <path d="M17.5 11.5a3.5 3.5 0 0 0-7 0" />
              <path d="M5 10.5 A3.5 3.5 0 0 1 8.5 7" />
              <path d="M2 12c0 2 2.5 10 10 10s10-8 10-10c0-1.688-1.5-3-3-3 0-1.5-1.5-3-3-3-1.022 0-1.917.548-2.410 1.364" />
              <path d="M8.5 7c-.99 0-1.898.38-2.575 1" />
              <path d="M2 12c0-1.688 1.5-3 3-3" />
            </svg>
            <span className="font-bold text-xl text-puma-blue-500">Puma-AI</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="py-4">
          <div className="px-4 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-puma-blue-50">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                  JD
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">John Doe</div>
                <div className="text-xs text-muted-foreground">Team Manager</div>
              </div>
            </div>
          </div>
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  location.pathname === item.href
                    ? "bg-puma-blue-50 text-puma-blue-500"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {item.icon}
                {item.title}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r">
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-puma-blue-500"
            >
              <path d="M12 22c7.5 0 10-8 10-10a3.076 3.076 0 0 0-5.954-1" />
              <path d="M17.5 11.5a3.5 3.5 0 0 0-7 0" />
              <path d="M5 10.5 A3.5 3.5 0 0 1 8.5 7" />
              <path d="M2 12c0 2 2.5 10 10 10s10-8 10-10c0-1.688-1.5-3-3-3 0-1.5-1.5-3-3-3-1.022 0-1.917.548-2.410 1.364" />
              <path d="M8.5 7c-.99 0-1.898.38-2.575 1" />
              <path d="M2 12c0-1.688 1.5-3 3-3" />
            </svg>
            <span className="font-bold text-xl text-puma-blue-500">Puma-AI</span>
          </div>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="px-4 my-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-puma-blue-50">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                  JD
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">John Doe</div>
                <div className="text-xs text-muted-foreground">Team Manager</div>
              </div>
            </div>
          </div>
          <nav className="mt-2 flex-1 space-y-1 px-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  location.pathname === item.href
                    ? "bg-puma-blue-50 text-puma-blue-500"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {item.icon}
                {item.title}
              </a>
            ))}
          </nav>
          <div className="p-4 border-t mt-auto">
            <Button 
              onClick={handleLogout}
              variant="outline" 
              className="w-full justify-start text-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden lg:pl-64">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white border-b">
          <div className="flex flex-1 items-center justify-between px-4">
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open sidebar</span>
              </Button>
            </div>
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                FC Rangers U12
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt="User" />
                      <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                        JD
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
