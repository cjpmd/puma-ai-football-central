
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
import { UserCircle, Settings, LogOut } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { UserLoginModal } from "../modals/UserLoginModal";
import { UserSignupModal } from "../modals/UserSignupModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function Header() {
  const { user, profile, signOut } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const navigate = useNavigate();

  const isLoggedIn = !!user;

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      navigate('/');
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out. Please try again.");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link 
            to="/" 
            className="flex items-center gap-2 font-bold text-xl text-puma-blue-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M12 22c7.5 0 10-8 10-10a3.076 3.076 0 0 0-5.954-1" />
              <path d="M17.5 11.5a3.5 3.5 0 0 0-7 0" />
              <path d="M5 10.5 A3.5 3.5 0 0 1 8.5 7" />
              <path d="M2 12c0 2 2.5 10 10 10s10-8 10-10c0-1.688-1.5-3-3-3 0-1.5-1.5-3-3-3-1.022 0-1.917.548-2.410 1.364" />
              <path d="M8.5 7c-.99 0-1.898.38-2.575 1" />
              <path d="M2 12c0-1.688 1.5-3 3-3" />
            </svg>
            <span>Puma-AI</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/features" className="text-sm font-medium hover:text-puma-blue-500 transition-colors">
            Features
          </Link>
          <Link to="/pricing" className="text-sm font-medium hover:text-puma-blue-500 transition-colors">
            Pricing
          </Link>
          <Link to="/about" className="text-sm font-medium hover:text-puma-blue-500 transition-colors">
            About
          </Link>
          <Link to="/contact" className="text-sm font-medium hover:text-puma-blue-500 transition-colors">
            Contact
          </Link>
        </nav>
        
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" alt={profile?.name || "User"} />
                    <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                      {profile?.name ? profile.name.substring(0, 2).toUpperCase() : <UserCircle className="h-6 w-6" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {profile?.name || "My Account"}
                  {profile?.email && (
                    <div className="text-xs text-muted-foreground">{profile.email}</div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/teams")}>
                  Teams
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/clubs")}>
                  Clubs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setShowLoginModal(true)}
                className="text-puma-blue-500 hover:text-puma-blue-600 hover:bg-puma-blue-50"
              >
                Log in
              </Button>
              <Button 
                onClick={() => setShowSignupModal(true)}
                className="bg-puma-blue-500 text-white hover:bg-puma-blue-600"
              >
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>

      <UserLoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onLogin={() => {
          setShowLoginModal(false);
          navigate('/dashboard');
        }}
      />

      <UserSignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSignup={() => {
          setShowSignupModal(false);
          navigate('/dashboard');
        }}
      />
    </header>
  );
}
