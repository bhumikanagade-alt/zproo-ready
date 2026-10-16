import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@zproo/ui';
import {
  Bell,
  CalendarCheck,
  Gift,
  Tag,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';
import { bookingKeys } from '@/features/checkout/api';
import { timeAgo, useHotelNotifications } from '@/features/hotels/notifications';
import { apiGet } from '@/services/http';

type NotificationType =
  | 'booking'
  | 'offer'
  | 'reward';

interface NotificationItem {
  id: number | string;
  type: NotificationType;
  title: string;
  message: string;
  icon:
    | typeof CalendarCheck
    | typeof Tag
    | typeof Gift;
  time: string;
  unread: boolean;
  route: string;
}

interface BookingListItem {
  reference: string;
  serviceType: 'BUS' | 'FLIGHT';
  status:
    | 'INITIATED'
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REFUND_PENDING'
    | 'REFUNDED';
  paymentStatus: string;
  title: string;
  subtitle: string;
  travelDate: string;
  totalPaise: number;
  createdAt: string;
}

/*
 * General notifications.
 *
 * These notifications are not connected to
 * any particular booking.
 *
 * They remain visible after logout.
 */
const generalNotifications: NotificationItem[] = [
  {
    id: 2,
    type: 'offer',
    title: 'Special Booking Offer',
    message:
      'Get up to 20% OFF on your next bus booking.',
    icon: Tag,
    time: '10 min ago',
    unread: true,
    route: '/offers',
  },
  {
    id: 3,
    type: 'reward',
    title: 'Exclusive Cashback',
    message:
      'Enjoy cashback on your next ZPROO booking.',
    icon: Gift,
    time: '1 hour ago',
    unread: false,
    route: '/offers',
  },
];

export function NotificationBell() {
  const navigate = useNavigate();

  const user = useAuthStore(
    (state) => state.user,
  );

  const status = useAuthStore(
    (state) => state.status,
  );

  const isSignedIn =
    status === 'authenticated' &&
    user !== null;

  /*
   * This contains the booking references that
   * already existed when the current user
   * started this session.
   *
   * Those bookings will NOT generate a new
   * Booking Confirmed notification.
   */
  const existingBookingReferences =
    useRef<Set<string>>(new Set());

  /*
   * Prevents the first API response after login
   * from being treated as a new booking.
   */
  const hasInitializedSession =
    useRef(false);

  /*
   * This state becomes true only when a NEW
   * confirmed booking is detected after login.
   */
  const [
    hasNewConfirmedBooking,
    setHasNewConfirmedBooking,
  ] = useState(false);

  /*
   * Real booking data.
   *
   * The query is refreshed periodically so that
   * when payment succeeds and the booking becomes
   * CONFIRMED, the notification can appear without
   * requiring the user to refresh the page.
   */
  const {
    data: bookings = [],
  } = useQuery<BookingListItem[]>({
    queryKey: bookingKeys.bookings,
    queryFn: () =>
      apiGet<BookingListItem[]>(
        '/bookings',
      ),
    enabled: isSignedIn,

    /*
     * Check for a newly confirmed booking
     * every 1.5 seconds while logged in.
     */
    refetchInterval: isSignedIn
      ? 1500
      : false,

    refetchOnWindowFocus: true,
  });

  /*
   * Reset the notification state when the user
   * logs out and establish a fresh baseline
   * when the user logs in.
   */
  useEffect(() => {
    if (!isSignedIn) {
      existingBookingReferences.current =
        new Set();

      hasInitializedSession.current =
        false;

      setHasNewConfirmedBooking(false);

      return;
    }

    /*
     * Do not clear the baseline every time
     * React Query refreshes the booking list.
     */
    if (hasInitializedSession.current) {
      return;
    }

    /*
     * Wait until the first booking response
     * is available.
     */
    if (!bookings) {
      return;
    }

    /*
     * Store all bookings that already existed
     * when the user logged in.
     *
     * This is the key part that prevents your
     * old Pune → Mumbai confirmed booking from
     * generating a new notification.
     */
    existingBookingReferences.current =
      new Set(
        bookings.map(
          (booking) => booking.reference,
        ),
      );

    hasInitializedSession.current =
      true;

    setHasNewConfirmedBooking(false);
  }, [
    isSignedIn,
    bookings,
  ]);

  /*
   * Detect a NEW successful booking.
   *
   * A booking must satisfy:
   *
   * 1. It did not exist when the user logged in.
   * 2. Its status is CONFIRMED or COMPLETED.
   * 3. Its payment status is successful.
   *
   * Therefore:
   *
   * Old confirmed booking
   *        ↓
   * No notification
   *
   * New successful payment
   *        ↓
   * Booking becomes CONFIRMED
   *        ↓
   * Booking Confirmed notification
   */
  useEffect(() => {
    if (
      !isSignedIn ||
      !hasInitializedSession.current
    ) {
      return;
    }

    const newlyConfirmedBooking =
      bookings.find((booking) => {
        const alreadyExisted =
          existingBookingReferences.current.has(
            booking.reference,
          );

        if (alreadyExisted) {
          return false;
        }

        const isConfirmed =
          booking.status === 'CONFIRMED' ||
          booking.status === 'COMPLETED';

        const isPaymentSuccessful =
          booking.paymentStatus ===
            'SUCCESS' ||
          booking.paymentStatus === 'PAID';

        return (
          isConfirmed &&
          isPaymentSuccessful
        );
      });

    if (newlyConfirmedBooking) {
      setHasNewConfirmedBooking(true);

      /*
       * Add the newly detected booking to the
       * existing set so it is not repeatedly
       * treated as a new booking.
       */
      existingBookingReferences.current.add(
        newlyConfirmedBooking.reference,
      );
    }
  }, [
    bookings,
    isSignedIn,
  ]);

  /*
   * Booking Confirmed is created ONLY after
   * a NEW successful booking is detected.
   */
  const bookingNotification: NotificationItem | null =
    isSignedIn &&
    hasNewConfirmedBooking
      ? {
          id: 1,
          type: 'booking',
          title: 'Booking Confirmed',
          message:
            'Your bus booking has been confirmed successfully.',
          icon: CalendarCheck,
          time: 'Just now',
          unread: true,
          route: '/bookings',
        }
      : null;

  /*
   * Hotel bookings are completed in the browser (no /bookings API record),
   * so the payment page records each confirmed stay in a small store and
   * the bell shows it here, only for the signed-in user who booked it.
   */
  const hotelItems = useHotelNotifications(
    (state) => state.items,
  );

  const hotelNotifications: NotificationItem[] =
    isSignedIn && user
      ? hotelItems
          .filter(
            (item) => item.userId === String(user.id),
          )
          .map((item) => ({
            id: `hotel-${item.reference}`,
            type: 'booking' as const,
            title: 'Hotel Booking Confirmed',
            message: `Your stay at ${item.hotelName}, ${item.city} is confirmed (${item.reference}).`,
            icon: CalendarCheck,
            time: timeAgo(item.createdAt),
            unread: true,
            route: `/hotels/confirmation?ref=${encodeURIComponent(item.reference)}`,
          }))
      : [];

  /*
   * Final notification list.
   */
  const notifications: NotificationItem[] = [
    ...(bookingNotification
      ? [bookingNotification]
      : []),
    ...hotelNotifications,
    ...generalNotifications,
  ];

  const unreadCount = notifications.filter(
    (notification) =>
      notification.unread,
  ).length;

  /*
   * Navigation:
   *
   * Booking Confirmed
   *       ↓
   * /bookings
   *
   * Special Booking Offer
   *       ↓
   * /offers
   *
   * Exclusive Cashback
   *       ↓
   * /offers
   */
  const handleNotificationSelect = (
    notification: NotificationItem,
  ) => {
    void navigate(notification.route);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-primary-light"
          aria-label={`Notifications${
            unreadCount > 0
              ? `, ${unreadCount} unread`
              : ''
          }`}
        >
          <Bell
            aria-hidden
            className="size-5 text-foreground/80 transition-transform duration-200 group-hover:scale-105"
          />

          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground ring-2 ring-card"
            >
              {unreadCount > 9
                ? '9+'
                : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl p-2"
      >
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-bold text-foreground">
                Notifications
              </p>

              <p className="mt-0.5 text-xs font-normal text-muted">
                Booking updates and special offers
              </p>
            </div>

            {unreadCount > 0 && (
              <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-bold text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className="max-h-[360px] overflow-y-auto">
          {notifications.map(
            (notification) => {
              const Icon =
                notification.icon;

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="mb-1 items-start gap-3 rounded-xl px-3 py-3 last:mb-0"
                  onSelect={() =>
                    handleNotificationSelect(
                      notification,
                    )
                  }
                >
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      notification.type ===
                      'booking'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-primary-light text-primary'
                    }`}
                  >
                    <Icon
                      aria-hidden
                      className="size-5!"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {notification.title}
                      </span>

                      {notification.unread && (
                        <span
                          aria-label="Unread notification"
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </span>

                    <span className="mt-1 block text-xs font-normal leading-5 text-muted">
                      {notification.message}
                    </span>

                    <span className="mt-1.5 block text-[11px] font-medium text-muted/80">
                      {notification.time}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            },
          )}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="justify-center font-bold text-primary hover:text-primary"
          onSelect={() =>
            void navigate('/offers')
          }
        >
          View all offers
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}