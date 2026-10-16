import { Router } from 'express';
import type { Env } from '../config/env';
import type { Services } from '../container';
import { createAdminUsersController } from '../controllers/adminUsers.controller';
import { createAuthController } from '../controllers/auth.controller';
import { createBookingsController } from '../controllers/bookings.controller';
import { createBusesController } from '../controllers/buses.controller';
import { createFlightsController } from '../controllers/flights.controller';
import { createPaymentsController } from '../controllers/payments.controller';
import { createMeController } from '../controllers/me.controller';
import { createTrainsController } from '../controllers/trains.controller';
import { authenticate, requireAuth } from '../middleware/auth';
import { authRateLimiters, type RateLimitStoreFactory } from '../middleware/rateLimit';
import { adminRoutes } from './admin.routes';
import { authRoutes } from './auth.routes';
import {
  bookingRoutes,
  busRoutes,
  flightRoutes,
  paymentRoutes,
  trainRoutes,
} from './commerce.routes';
import { healthRoutes } from './health.routes';
import { meRoutes } from './me.routes';

/** Mounts every module router under `/api`. New modules register here. */
export function createApiRouter(
  services: Services,
  env: Env,
  rateLimitStore: RateLimitStoreFactory,
): Router {
  const requireUser = authenticate(services.tokens);
  const router = Router();
  router.use('/health', healthRoutes(services.health));
  router.use(
    '/auth',
    authRoutes(
      createAuthController(services.auth, services.tokens, env),
      authRateLimiters(rateLimitStore),
      requireUser,
    ),
  );
  router.use('/me', meRoutes(createMeController(services.users), requireUser));
  router.post('/booking-abandonment', requireUser, async (req, res) => {
    const body = req.body as { tripId?: string; travelDate?: string; seats?: string[]; contactEmail?: string };
    const profile = await services.users.getProfile(requireAuth(req).userId);
    const email = body.contactEmail ?? profile.email;
    if (!email) return res.status(400).json({ success: false, message: 'No email address is available for follow-up.', errorCode: 'BAD_REQUEST', data: null });
    await services.email.send({
      to: email,
      subject: 'You left a ZPROO BUS booking in progress',
      text: `Your ZPROO BUS selection was not completed. ${body.travelDate ? `Travel date: ${body.travelDate}. ` : ''}${body.seats?.length ? `Selected seats: ${body.seats.join(', ')}. ` : ''}Return to ZPROO GO to continue when you are ready.`,
    });
    return res.status(202).json({ success: true, message: 'Follow-up request queued.', data: { captured: true, provider: services.email.name, developmentOnly: services.email.isDevelopment } });
  });
  router.use(
    '/admin',
    adminRoutes({ users: createAdminUsersController(services.users) }, requireUser, services.rbac),
  );
  router.use(
    '/flights',
    flightRoutes(
      createFlightsController(services.flights, services.bookings),
      requireUser,
      services.rbac,
    ),
  );
  router.use(
    '/buses',
    busRoutes(createBusesController(services.buses, services.bookings), requireUser, services.rbac),
  );
  router.use(
    '/trains',
    trainRoutes(
      createTrainsController(services.trains, services.bookings, services.trainReservations, services.rbac),
      requireUser,
      services.rbac,
    ),
  );
  router.use(
    '/bookings',
    bookingRoutes(
      createBookingsController(services.bookings, services.tickets, services.rbac),
      requireUser,
      services.rbac,
    ),
  );
  router.use(
    '/payments',
    paymentRoutes(createPaymentsController(services.payments), requireUser, services.rbac, {
      mockCheckout: services.payments.providerName === 'mock' && !env.isProduction,
    }),
  );
  return router;
}
