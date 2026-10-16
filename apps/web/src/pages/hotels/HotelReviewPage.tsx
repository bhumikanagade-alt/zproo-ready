import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@zproo/ui';
import { ArrowRight, CheckCircle2, Lock, Tag } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { HoldBanner } from '@/features/hotels/components/HoldBanner';
import { HotelSteps } from '@/features/hotels/components/HotelSteps';
import { PriceBox } from '@/features/hotels/components/PriceBox';
import { MEAL_PLAN_LABEL, nightsBetween } from '@/features/hotels/data';
import { describeCancellation } from '@/features/hotels/cancellation';
import { formatDate } from '@/features/hotels/dates';
import { hotelPaymentUrl, hotelRoomsUrl } from '@/features/hotels/links';
import { guestsLabel } from '@/features/hotels/occupancy';
import { checkCoupon, priceStay } from '@/features/hotels/pricing';
import { useHotelBooking } from '@/features/hotels/store';
import { SPECIAL_REQUEST_DISCLAIMER, specialRequestLabel } from '@/features/hotels/validation';

export default function HotelReviewPage() {
  const navigate = useNavigate();
  const state = useHotelBooking();
  const { hotel, room, checkIn, checkOut, rooms, adults, children, guests, contact, coupon, specialRequests, specialNote } = state;
  const [couponInput, setCouponInput] = useState(coupon ?? '');
  const [couponError, setCouponError] = useState('');
  if (!hotel || !room || !contact || guests.length === 0) return <Navigate to="/hotels/booking" replace />;

  const nights = nightsBetween(checkIn, checkOut);
  const price = priceStay(room, nights, rooms, coupon);
  const cancellation = describeCancellation(room.cancellation, checkIn, hotel.checkInTime);

  const applyCoupon = () => {
    const result = checkCoupon(couponInput);
    if (!result.ok) {
      setCouponError(result.message);
      state.setCoupon(null);
      return;
    }
    setCouponError('');
    state.setCoupon(result.code);
  };
  const removeCoupon = () => {
    state.setCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Seo title="Review hotel booking" noIndex />
      <HotelSteps current={2} />
      <HoldBanner holdKey={`${hotel.id}:${room.id}:${checkIn}:${checkOut}:${rooms}`} roomsUrl={hotelRoomsUrl(hotel.id)} />
      <div className="mb-5"><h1 className="text-3xl font-extrabold">Review your stay</h1><p className="mt-1 text-sm text-muted">Check dates, guests, cancellation terms and the final price before payment.</p></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <main className="space-y-5">
          <Card><CardHeader><CardTitle>{hotel.name}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            <p className="text-muted">{hotel.address} · {hotel.stars}-star · {hotel.rating.toFixed(1)}/5</p>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div><dt className="text-xs text-muted">Check-in</dt><dd className="font-bold">{formatDate(checkIn)}</dd><dd className="text-xs text-muted">from {hotel.checkInTime}</dd></div>
              <div><dt className="text-xs text-muted">Check-out</dt><dd className="font-bold">{formatDate(checkOut)}</dd><dd className="text-xs text-muted">until {hotel.checkOutTime}</dd></div>
              <div><dt className="text-xs text-muted">Stay</dt><dd className="font-bold">{nights} night{nights === 1 ? '' : 's'}</dd></div>
              <div><dt className="text-xs text-muted">Rooms</dt><dd className="font-bold">{rooms}</dd></div>
              <div><dt className="text-xs text-muted">Guests</dt><dd className="font-bold">{guestsLabel(adults, children)}</dd></div>
            </dl>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Room &amp; policies</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            <p className="flex flex-wrap items-center gap-2"><Badge variant="soft">{room.name}</Badge><span>{rooms} × {room.beds}</span></p>
            <p><strong>Meal plan:</strong> {MEAL_PLAN_LABEL[room.mealPlan]}</p>
            <div className="rounded-xl bg-primary-light p-3"><CheckCircle2 aria-hidden className="mr-2 inline size-4 text-primary" /><strong>{cancellation.headline}</strong>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-xs text-muted">{cancellation.rules.map((r) => <li key={r}>{r}</li>)}</ul></div>
            <p className="text-muted">{room.payAtProperty ? 'Pay at property: nothing is charged now.' : 'Prepaid: you pay now to confirm.'}</p>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Guests &amp; contact</CardTitle></CardHeader><CardContent className="text-sm">
            <ul className="divide-y divide-border">{guests.map((g, i) => <li key={i} className="py-1.5">{g.firstName} {g.lastName} · {g.type === 'ADULT' ? 'Adult' : 'Child'} · {g.age} yrs</li>)}</ul>
            <p className="mt-3 text-muted">{contact.name ? `${contact.name} · ` : ''}{contact.email} · {contact.phone}</p>
            {(specialRequests.length > 0 || specialNote) && (
              <div className="mt-3"><p className="font-semibold">Special requests</p>
                <ul className="mt-1 list-disc pl-5 text-muted">{specialRequests.map((id) => <li key={id}>{specialRequestLabel(id)}</li>)}{specialNote && <li>{specialNote}</li>}</ul>
                <p className="mt-1 text-xs text-muted">{SPECIAL_REQUEST_DISCLAIMER}</p></div>
            )}
            <Link to="/hotels/booking" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Edit guest details</Link>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Tag aria-hidden className="size-4" /> Coupon / offer</CardTitle></CardHeader><CardContent>
            <div className="flex gap-2"><Input aria-label="Hotel coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Enter coupon (ZPROO10, STAY15)" /><Button type="button" variant="outline" onClick={applyCoupon}>Apply</Button>{coupon && <Button type="button" variant="ghost" onClick={removeCoupon}>Remove</Button>}</div>
            {coupon && <p role="status" className="mt-2 text-sm text-primary">Coupon {coupon} applied. You save {price.couponPercent}% on the room price.</p>}
            {couponError && <p role="alert" className="mt-2 text-sm text-danger">{couponError}</p>}
          </CardContent></Card>
        </main>
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="mb-4 font-extrabold">Price summary</h2>
          <PriceBox price={price} payAtProperty={room.payAtProperty} />
          <Button size="lg" className="mt-5 w-full" onClick={() => void navigate(hotelPaymentUrl)}><Lock aria-hidden /> {room.payAtProperty ? 'Continue to confirm' : 'Continue to payment'} <ArrowRight aria-hidden /></Button>
          <p className="mt-3 text-center text-xs text-muted">You will review your payment method before confirmation.</p>
        </aside>
      </div>
    </div>
  );
}
