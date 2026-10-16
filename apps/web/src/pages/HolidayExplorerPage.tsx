import { Seo } from '@/components/seo/Seo';

/**
 * The Holiday Explorer is kept as a self-contained page so its complete interaction
 * flow and styling do not affect the existing bus, flight, hotel, or shared UI code.
 * Replace the mock-data layer in public/holiday-explorer.html with API calls when ready.
 */
export default function HolidayExplorerPage() {
  return (
    <>
      <Seo
        title="ZPROO Holidays Explorer"
        description="Explore holiday packages, compare itineraries, and complete a demo booking."
      />
      <main className="w-full overflow-hidden bg-white pb-12 sm:pb-16">
        <iframe
          title="ZPROO Holidays Explorer"
          src="/holiday-explorer.html"
          className="block w-full border-0"
          style={{ height: 'calc(100vh - 64px)', minHeight: '760px' }}
          loading="eager"
          allow="payment; clipboard-write; web-share"
        />
      </main>
    </>
  );
}
