
import { useAuth } from "@/contexts/AuthContext";
import { UserLoginModal } from "@/components/modals/UserLoginModal";
import { UserSignupModal } from "@/components/modals/UserSignupModal";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "./Logo";
import { useLocation } from "react-router-dom";
import { EntityHeader } from "@/components/shared/EntityHeader";

export function Header() {
  const { user, logout, currentTeam } = useAuth();
  const location = useLocation();
  
  // Show team logo in header when on team-related pages
  const showTeamLogo = location.pathname.includes('/teams') || 
                      location.pathname.includes('/dashboard') ||
                      location.pathname.includes('/players') ||
                      location.pathname.includes('/events') ||
                      location.pathname.includes('/analytics');

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Logo className="h-6 w-6" showText={true} />
        </div>
        
        {/* Team Logo Display */}
        {showTeamLogo && currentTeam && (
          <div className="flex items-center ml-4 pl-4 border-l">
            <EntityHeader 
              logoUrl={currentTeam.logoUrl}
              entityName={currentTeam.name}
              entityType="team"
              className="text-sm"
            />
          </div>
        )}
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none" />
          <nav className="flex items-center space-x-2">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <UserLoginModal 
                  isOpen={false}
                  onClose={() => {}}
                  onLogin={() => {}}
                />
                <UserSignupModal 
                  isOpen={false}
                  onClose={() => {}}
                  onSignup={() => {}}
                />
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
