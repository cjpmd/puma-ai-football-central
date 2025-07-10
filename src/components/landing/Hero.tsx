
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Users, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
          <div className="mt-24 sm:mt-32 lg:mt-16">
            <a href="#" className="inline-flex space-x-6">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold leading-6 text-primary ring-1 ring-inset ring-primary/20">
                What's new
              </span>
              <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-muted-foreground">
                <span>Just shipped v2.0</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            </a>
          </div>
          <h1 className="mt-10 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Team Management Made Simple
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            The complete solution for sports teams. Manage players, track performance, 
            organize events, and build stronger teams with our comprehensive platform.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Link to="/auth">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Learn more
            </Button>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <img
              src="/lovable-uploads/0e7b2d9e-64e2-46da-8a4f-01a3e2cd50df.png"
              alt="Team Manager Dashboard"
              width={2432}
              height={1442}
              className="w-[76rem] rounded-md bg-white/5 shadow-2xl ring-1 ring-white/10"
            />
          </div>
        </div>
      </div>
      
      {/* Feature highlights */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3 lg:mx-0 lg:max-w-none">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-lg bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Player Management</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete player profiles, stats tracking, and performance analytics
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="rounded-lg bg-primary/10 p-3">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Team Organization</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Streamlined team setup, events planning, and communication tools
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="rounded-lg bg-primary/10 p-3">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Performance Analytics</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Data-driven insights to improve team and individual performance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
