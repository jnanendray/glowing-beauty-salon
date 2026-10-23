import Image from "next/image";
import Container from "@/components/Container";

export const services = [
  {
    id: "hair",
    name: "Haircut & Styling",
    desc: "Precision cuts, blow-dry and styling for every hair type and occasion.",
    photo: "/services/hair.jpg",
    home: false,
  },
  {
    id: "facial",
    name: "Facial & Skincare",
    desc: "Deep-cleansing facials, brightening treatments and skin consultations.",
    photo: "/services/facial.jpg",
    home: true,
  },
  {
    id: "bridal",
    name: "Bridal & Party Makeup",
    desc: "HD and airbrush makeup for weddings, engagements and parties.",
    photo: "/services/bridal.jpg",
    home: true,
  },
  {
    id: "spa",
    name: "Spa & Body Massage",
    desc: "Relaxing full-body massage, aromatherapy and spa rituals.",
    photo: "/services/spa.jpg",
    home: true,
  },
  {
    id: "waxing",
    name: "Waxing & Threading",
    desc: "Full-body waxing, threading and clean, gentle grooming.",
    photo: "/services/waxing.jpg",
    home: false,
  },
  {
    id: "nails",
    name: "Manicure & Pedicure",
    desc: "Nail care, gel polish and hand & foot spa treatments.",
    photo: "/services/nails.jpg",
    home: false,
  },
];

export const stylists = [
  { id: "1", name: "Ananya Rao", role: "Senior Hair Stylist", photo: "/stylists/stylist-1.jpg" },
  { id: "2", name: "Meera Iyer", role: "Bridal & Beauty Specialist", photo: "/stylists/stylist-2.jpg" },
];

export function Hero() {
  return (
    <section id="top" className="blush-field">
      <Container className="grid gap-10 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <span className="font-body inline-flex items-center gap-1.5 rounded-full border border-[#c99a8a]/50 bg-white/60 px-3.5 py-1.5 text-xs font-semibold text-[#9a5a46]">
            ✦ Now booking in your city
          </span>

          <div className="wordmark-wrap mt-5">
            <p className="wordmark-line font-display text-[2.8rem] italic font-semibold leading-none sm:text-[3.6rem] md:text-[4.6rem]">
              <span className="wordmark-textstack">
                <span className="wordmark-extrude">Glowing</span>
                <span className="wordmark-fill fill-primary">Glowing</span>
              </span>
              <svg
                className="wordmark-icon h-[0.52em] w-[0.52em] shrink-0"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g fill="#e3ab93" stroke="#b8765f" strokeWidth="1.6">
                  <ellipse cx="32" cy="18" rx="7" ry="10" />
                  <ellipse cx="32" cy="46" rx="7" ry="10" />
                  <ellipse cx="18" cy="32" rx="10" ry="7" />
                  <ellipse cx="46" cy="32" rx="10" ry="7" />
                </g>
                <circle cx="32" cy="32" r="6.5" fill="#f4cc85" stroke="#b8765f" strokeWidth="1.6" />
              </svg>
            </p>
            <p className="wordmark-line font-display mt-2 text-[1.7rem] font-semibold uppercase leading-none tracking-[0.2em] sm:text-[2.1rem] md:text-[2.6rem]">
              <span className="wordmark-textstack">
                <span className="wordmark-extrude">Beauty Salon</span>
                <span className="wordmark-fill fill-secondary">Beauty Salon</span>
              </span>
            </p>
          </div>

          <p className="font-body mt-7 max-w-[520px] text-base leading-relaxed text-[#6b4c42] md:text-lg">
            Hair, skin, spa and bridal beauty — in our studio or at your doorstep.
            Choose your stylist, pick a slot, and glow.
          </p>

          <div className="mt-8 flex flex-wrap gap-3.5">
            <a
              href="#booking"
              className="font-body rounded-full bg-[#b8765f] px-6 py-3.5 text-center text-sm font-semibold text-[#fdf5f1] hover:bg-[#c48670] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3a241f]"
            >
              Book an appointment
            </a>
            <a
              href="#services"
              className="font-body rounded-full border border-[#c99a8a] px-6 py-3.5 text-center text-sm font-semibold text-[#3a241f] hover:bg-white/50"
            >
              View services
            </a>
          </div>

          <div className="font-body mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6b4c42]">
            <span className="badge-tick gap-1.5">✓ Certified stylists</span>
            <span className="badge-tick gap-1.5">✓ Home service available</span>
            <span className="badge-tick gap-1.5">✓ Book days or weeks ahead</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <div className="aspect-[3/4] overflow-hidden rounded-[28px] bg-[#f1d9cf] shadow-[0_18px_40px_rgba(58,36,31,0.12)]">
              <Image
                src="/hero/hero-1.jpg"
                alt="Stylist styling a client's hair at Glowing Beauty Salon"
                width={480}
                height={640}
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </div>
          <div className="flex flex-col gap-4 pt-10">
            <div className="aspect-square overflow-hidden rounded-[28px] bg-[#f1d9cf] shadow-[0_18px_40px_rgba(58,36,31,0.12)]">
              <Image
                src="/hero/hero-2.jpg"
                alt="Client receiving a relaxing facial treatment"
                width={420}
                height={420}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="aspect-[4/5] overflow-hidden rounded-[28px] bg-[#f1d9cf] shadow-[0_18px_40px_rgba(58,36,31,0.12)]">
              <Image
                src="/hero/hero-3.jpg"
                alt="Bridal makeup being applied by a makeup artist"
                width={420}
                height={520}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Services() {
  return (
    <section id="services" className="bg-[#fdf5f1] py-16 md:py-24">
      <Container>
        <div className="max-w-[640px]">
          <h2 className="font-display text-2xl font-semibold text-[#3a241f] md:text-3xl">
            Our services
          </h2>
          <p className="font-body mt-3 text-[#6b4c42]">
            Every treatment can be booked in-studio. Look for the{" "}
            <span className="font-semibold text-[#9a5a46]">At-home available</span>{" "}
            tag for services we also bring to your door.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.id}
              className="overflow-hidden rounded-3xl border border-[#3a241f]/8 bg-white shadow-[0_10px_30px_rgba(58,36,31,0.06)]"
            >
              <div className="aspect-[4/3] bg-[#f1d9cf]">
                <Image
                  src={s.photo}
                  alt={s.name}
                  width={480}
                  height={360}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-[#3a241f]">
                    {s.name}
                  </h3>
                  {s.home && (
                    <span className="font-body shrink-0 rounded-full bg-[#f1d9cf] px-2.5 py-1 text-[11px] font-semibold text-[#9a5a46]">
                      At-home available
                    </span>
                  )}
                </div>
                <p className="font-body mt-2 text-sm leading-relaxed text-[#6b4c42]">
                  {s.desc}
                </p>
                <a
                  href="#booking"
                  className="font-body mt-4 inline-block text-sm font-semibold text-[#b8765f] hover:text-[#9a5a46]"
                >
                  Book this service →
                </a>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

const steps = [
  {
    title: "Pick a service & stylist",
    desc: "Choose your treatment, pick a stylist you love, and see their open slots.",
  },
  {
    title: "Choose salon or home",
    desc: "Book in-studio, or bring select premium services to your doorstep for a home-service charge.",
  },
  {
    title: "Confirm your slot",
    desc: "Sign in, confirm the date and time, and get a confirmation instantly.",
  },
  {
    title: "Relax and glow",
    desc: "We'll remind you before your visit, and again when it's time for your next one.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="petal-field bg-[#fdf5f1] py-16 md:py-24">
      <Container>
        <h2 className="font-display text-2xl font-semibold text-[#3a241f] md:text-3xl">
          How booking works
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-[#3a241f]/8 bg-white p-6 shadow-[0_8px_24px_rgba(58,36,31,0.05)]"
            >
              <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-[#b8765f] text-sm font-semibold text-[#fdf5f1]">
                {i + 1}
              </span>
              <h3 className="font-display mt-4 text-base font-semibold text-[#3a241f]">
                {step.title}
              </h3>
              <p className="font-body mt-2 text-sm leading-relaxed text-[#6b4c42]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function Stylists() {
  return (
    <section id="stylists" className="bg-[#fdf5f1] py-16 md:py-24">
      <Container>
        <div className="max-w-[640px]">
          <h2 className="font-display text-2xl font-semibold text-[#3a241f] md:text-3xl">
            Choose your stylist
          </h2>
          <p className="font-body mt-3 text-[#6b4c42]">
            Each of our stylists has their own calendar — pick the one you trust
            and book directly into their open slots.
          </p>
        </div>
        <div className="mt-10 grid max-w-[640px] gap-8 sm:grid-cols-2">
          {stylists.map((person) => (
            <div key={person.id} className="text-center">
              <div className="mx-auto aspect-square w-full overflow-hidden rounded-3xl bg-[#f1d9cf] shadow-[0_10px_30px_rgba(58,36,31,0.08)]">
                <Image
                  src={person.photo}
                  alt={person.name}
                  width={360}
                  height={360}
                  className="h-full w-full object-cover"
                />
              </div>
              <h3 className="font-display mt-4 text-base font-semibold text-[#3a241f]">
                {person.name}
              </h3>
              <p className="font-body text-sm text-[#9a5a46]">{person.role}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function TrustCta() {
  return (
    <section className="espresso-field py-16 md:py-20">
      <Container className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-[560px]">
          <h2 className="font-display text-2xl font-semibold text-[#fdf5f1] md:text-3xl">
            Your data, your appointments — kept safe
          </h2>
          <p className="font-body mt-3 text-[#e9d3c8]">
            Every booking and message is encrypted in transit and protected with
            strict access controls, so only you and our salon team ever see your
            details.
          </p>
        </div>
        <a
          href="#booking"
          className="font-body shrink-0 rounded-full bg-[#e3ab93] px-6 py-3.5 text-sm font-semibold text-[#3a241f] hover:bg-[#edc1ac]"
        >
          Book an appointment
        </a>
      </Container>
    </section>
  );
}

const faqs = [
  {
    q: "Can I choose my stylist?",
    a: "Yes — every service shows the stylists who offer it, along with their individual availability, so you can book with the person you trust.",
  },
  {
    q: "Do you offer home service?",
    a: "Select premium services (bridal and party makeup, spa treatments, and more) can be booked at our studio or at your home for an additional home-service charge.",
  },
  {
    q: "How do I sign in?",
    a: "You can sign in with Google or your email. Phone and WhatsApp OTP sign-in are shown as a preview of what's coming — they're disabled for now and require a paid SMS/WhatsApp service we only switch on for live client launches.",
  },
  {
    q: "Will you remind me to come back?",
    a: "Yes — if it's been 4 to 6 weeks since your last visit, we'll send a friendly reminder on WhatsApp with an offer to book again.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-[#fdf5f1] py-16 md:py-24">
      <Container className="max-w-[760px]">
        <h2 className="font-display text-2xl font-semibold text-[#3a241f] md:text-3xl">
          Frequently asked questions
        </h2>
        <div className="mt-8 flex flex-col gap-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="faq-item rounded-2xl border border-[#3a241f]/10 bg-white p-5"
            >
              <summary className="font-body flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-[#3a241f]">
                {item.q}
                <svg
                  className="faq-chevron h-4 w-4 shrink-0 text-[#9a5a46]"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <p className="font-body mt-3 text-sm leading-relaxed text-[#6b4c42]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="espresso-field border-t border-[#fdf5f1]/10 py-12">
      <Container className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="font-display text-lg font-semibold italic text-[#fdf5f1]">
            Glowing Beauty Salon
          </span>
          <p className="font-body mt-2 max-w-[320px] text-sm text-[#e9d3c8]">
            Hair, skin, spa and bridal beauty — in our studio or at your doorstep.
          </p>
        </div>
        <div className="font-body text-sm text-[#e9d3c8]">
          <p>Open daily, 9 AM – 8 PM</p>
          <p className="mt-1">Find us on the map below for directions.</p>
        </div>
      </Container>
      <Container className="mt-8 border-t border-[#fdf5f1]/10 pt-6">
        <p className="font-body text-xs text-[#c9a99a]">
          © {new Date().getFullYear()} Glowing Beauty Salon. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
