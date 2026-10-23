export default function WhatsAppButton() {
  const rawNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const digits = rawNumber.replace(/\D/g, "");
  if (!digits) return null;

  const text = encodeURIComponent(
    "Hi Glowing Beauty Salon, I'd like to book an appointment."
  );
  const href = `https://wa.me/${digits}?text=${text}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Glowing Beauty Salon on WhatsApp"
      className="fixed bottom-[5.5rem] right-6 z-40 flex items-center gap-2 rounded-full bg-green-700 px-5 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(58,36,31,0.35)] hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.12-2.9-6.99A9.82 9.82 0 0 0 12.04 2m0 1.8a8.1 8.1 0 0 1 8.1 8.1c0 4.47-3.63 8.1-8.1 8.1a8.04 8.04 0 0 1-4.1-1.12l-.29-.17-3.06.8.82-3-.19-.3a8.04 8.04 0 0 1-1.26-4.31c0-4.47 3.63-8.1 8.08-8.1m-3.01 4.37c-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.26 0 1.33.97 2.62 1.1 2.8.14.18 1.9 2.9 4.61 3.95.65.25 1.15.4 1.55.52.65.2 1.24.17 1.71.1.52-.07 1.6-.65 1.83-1.29.23-.63.23-1.17.16-1.29-.07-.12-.25-.18-.52-.32-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.13-.42-2.16-1.34-.8-.71-1.34-1.6-1.5-1.87-.16-.27-.02-.42.12-.56.12-.12.27-.32.4-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.6-1.5-.84-2.04-.22-.53-.44-.46-.6-.47h-.51Z" />
      </svg>
      Chat on WhatsApp
    </a>
  );
}
