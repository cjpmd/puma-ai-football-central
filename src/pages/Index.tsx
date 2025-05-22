
import { MainLayout } from "@/components/layout/MainLayout";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";

const Index = () => {
  return (
    <MainLayout>
      <Hero />
      <Features />
      <Pricing />
      <Testimonials />
    </MainLayout>
  );
};

export default Index;
