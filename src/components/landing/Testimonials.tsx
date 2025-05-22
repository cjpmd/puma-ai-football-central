
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export function Testimonials() {
  const testimonials = [
    {
      quote: "Puma-AI has transformed how we manage our youth teams. The player development tracking is invaluable!",
      name: "Sarah Johnson",
      title: "Club Director, United FC",
      avatar: "",
      initials: "SJ",
    },
    {
      quote: "The team selection and formation tools make match preparation so much easier. It's saved us hours every week.",
      name: "Michael Chen",
      title: "Head Coach, Eagles Academy",
      avatar: "",
      initials: "MC",
    },
    {
      quote: "Managing player subscriptions used to be a nightmare. With Puma-AI, it's seamless and our cash flow has improved.",
      name: "David Thompson",
      title: "Club Treasurer, Riverside FC",
      avatar: "",
      initials: "DT",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="inline-block rounded-lg bg-puma-blue-50 px-3 py-1 text-sm text-puma-blue-500">
            Testimonials
          </div>
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
            Trusted by clubs and teams nationwide
          </h2>
          <p className="max-w-[700px] text-gray-500 md:text-lg">
            Hear what our users have to say about Puma-AI
          </p>
        </div>
        
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 mt-12">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-gray-50 border-none">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center">
                  <div className="relative inline-flex h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                        {testimonial.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-semibold">{testimonial.name}</h3>
                    <p className="text-xs text-gray-500">{testimonial.title}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">"{testimonial.quote}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
