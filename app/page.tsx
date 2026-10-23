import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import {
  Hero,
  Services,
  HowItWorks,
  Stylists,
  TrustCta,
  FAQ,
  Footer,
} from "@/components/Sections";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Services />
        <HowItWorks />
        <Stylists />
        <TrustCta />
        <FAQ />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
