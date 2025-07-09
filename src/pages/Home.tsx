
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src="/lovable-uploads/0e7b2d9e-64e2-46da-8a4f-01a3e2cd50df.png" 
            alt="Team Manager" 
            className="w-20 h-20"
          />
        </div>

        {/* Welcome Text */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Team Manager</h1>
          <p className="text-lg text-gray-600">Manage your teams like a pro</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link to="/auth" className="block">
            <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700">
              Get Started
            </Button>
          </Link>
          
          <Link to="/auth" className="block">
            <Button variant="outline" className="w-full h-12 text-lg">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
