
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  Users, 
  CalendarDays, 
  Settings, 
  LogOut, 
  Building2, 
  Trophy,
  CreditCard,
  UserCog,
  UserPlus
} from 'lucide-react';

export function Sidebar() {
  const { user, signOut } = useAuth();
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('global_admin');

  return (
    <div className="h-full flex flex-col border-r bg-background">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Coach's Playbook
        </h2>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-accent"
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/players"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-accent"
          >
            <Users className="h-4 w-4" />
            <span>Players</span>
          </Link>
          <Link
            to="/calendar"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-accent"
          >
            <CalendarDays className="h-4 w-4" />
            <span>Calendar & Events</span>
          </Link>
          <Link
            to="/teams"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-accent"
          >
            <Trophy className="h-4 w-4" />
            <span>Teams</span>
          </Link>
          <Link
            to="/clubs"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-accent"
          >
            <Building2 className="h-4 w-4" />
            <span>Clubs</span>
          </Link>
          <Link
            to="/staff"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-accent"
          >
            <UserCog className="h-4 w-4" />
            <span>Staff Management</span>
          </Link>
          <Link
            to="/users"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-accent"
          >
            <UserPlus className="h-4 w-4" />
            <span>User Management</span>
          </Link>
          <Link
            to="/subscriptions"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-accent"
          >
            <CreditCard className="h-4 w-4" />
            <span>Subscriptions</span>
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-accent"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </nav>
      </div>
      <div className="mt-auto p-4">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
