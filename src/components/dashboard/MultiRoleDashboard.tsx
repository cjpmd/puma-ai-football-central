import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shell } from "@/components/ui/shell";
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const MultiRoleDashboard = () => {
  const { user, clubs, teams, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading]);

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <Shell className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">User Profile</CardTitle>
          <CardDescription>View your profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{user?.name || 'Guest'}</h2>
              <p className="text-gray-500">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Your Clubs</CardTitle>
          <CardDescription>Manage your clubs and teams</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading clubs...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clubs.map((club) => (
                <Card key={club.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {club.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link to={`/club/${club.id}`} className="w-full">
                      <Button className="w-full">View Club</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-dashed border-2 border-gray-300 cursor-pointer hover:shadow-lg transition-shadow flex items-center justify-center">
                <CardContent className="flex items-center justify-center">
                  <Link to="/clubs/create" className="w-full text-center">
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Club
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Your Teams</CardTitle>
          <CardDescription>Access and manage your teams</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading teams...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <Card key={team.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {team.name}
                      <Badge variant="outline">{team.age_group}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link to={`/team/${team.id}`} className="w-full">
                      <Button className="w-full">View Team</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-dashed border-2 border-gray-300 cursor-pointer hover:shadow-lg transition-shadow flex items-center justify-center">
                <CardContent className="flex items-center justify-center">
                  <Link to="/teams/create" className="w-full text-center">
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Team
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
};
