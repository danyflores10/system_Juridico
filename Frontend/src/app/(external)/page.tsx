import { About } from "./_components/about";
import { Blog } from "./_components/blog";
import { CtaBanner } from "./_components/cta-banner";
import { Faq } from "./_components/faq";
import { Footer } from "./_components/footer";
import { Gallery } from "./_components/gallery";
import { Hero } from "./_components/hero";
import { Navbar } from "./_components/navbar";
import { Partners } from "./_components/partners";
import { Pricing } from "./_components/pricing";
import { ScrollProgress } from "./_components/scroll-progress";
import { Services } from "./_components/services";
import { Stats } from "./_components/stats";
import { Testimonials } from "./_components/testimonials";
import { WhatsappButton } from "./_components/whatsapp-button";

export default function Home() {
  return (
    <main className="overflow-x-clip bg-[#081020]">
      <ScrollProgress />
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Stats />
      <Gallery />
      <Pricing />
      <Testimonials />
      <Partners />
      <Faq />
      <CtaBanner />
      <Blog />
      <Footer />
      <WhatsappButton />
    </main>
  );
}
