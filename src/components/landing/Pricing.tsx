
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function Pricing() {
  return (
    <section className="py-16 md:py-24 bg-gray-50" id="pricing">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="inline-block rounded-lg bg-puma-blue-50 px-3 py-1 text-sm text-puma-blue-500">
            Pricing
          </div>
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="max-w-[600px] text-gray-500 md:text-lg">
            Choose the plan that's right for your team or club
          </p>
        </div>
        
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 mt-12">
          {/* Free Plan */}
          <div className="flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col justify-between space-y-4 p-6">
              <div>
                <h3 className="text-2xl font-bold">Free</h3>
                <div className="mt-2 text-4xl font-bold">£0<span className="text-sm font-normal text-gray-500">/month</span></div>
                <p className="mt-2 text-gray-500">Essential tools for small teams just getting started.</p>
              </div>
              <Button variant="outline">Get Started</Button>
            </div>
            <div className="bg-gray-50 p-6">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Unlimited players</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Team management</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Basic calendar</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Player profiles</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Basic match planning</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Analytics+ Plan */}
          <div className="relative flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 bg-puma-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg">
              Most Popular
            </div>
            <div className="flex flex-col justify-between space-y-4 p-6">
              <div>
                <h3 className="text-2xl font-bold">Analytics+</h3>
                <div className="mt-2 text-4xl font-bold">£19<span className="text-sm font-normal text-gray-500">/month</span></div>
                <p className="mt-2 text-gray-500">Advanced tools for serious teams and coaches.</p>
              </div>
              <Button className="bg-puma-blue-500 hover:bg-puma-blue-600">Get Started</Button>
            </div>
            <div className="bg-gray-50 p-6">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Everything in Free plan</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Advanced analytics</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Performance tracking</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Detailed player development</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Advanced match planning</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Club integration</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-puma-green-500" />
                  <span className="text-sm">Priority support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <h3 className="text-xl font-bold mb-3">Player Subscriptions</h3>
          <p className="max-w-[700px] mx-auto text-gray-500">
            Teams can set up their own player subscription fees that players or parents pay directly to the club.
            The club or team manager controls the subscription amount and payment frequency.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-6">
            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm border">
              <h4 className="font-bold text-lg">Full Squad</h4>
              <p className="text-sm text-gray-500 mt-2">
                Complete access to all team activities and resources
              </p>
            </div>
            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm border">
              <h4 className="font-bold text-lg">Training</h4>
              <p className="text-sm text-gray-500 mt-2">
                Access to training sessions only
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
