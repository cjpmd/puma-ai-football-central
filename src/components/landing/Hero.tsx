
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-b from-puma-blue-50 to-white">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tighter md:text-5xl lg:text-6xl">
            Revolutionize Your{" "}
            <span className="text-puma-blue-500">Football Team</span>{" "}
            Management
          </h1>
          <p className="mt-6 text-lg text-gray-500 md:text-xl">
            Puma-AI empowers coaches, clubs, and teams with comprehensive tools for
            player development, match planning, and performance analytics.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="bg-puma-blue-500 hover:bg-puma-blue-600">
              Get Started Free
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
