<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into TwinCore. PostHog is initialized via `instrumentation-client.ts` (the recommended approach for Next.js 15.3+) with a reverse proxy configured in `next.config.ts` to route events through `/ingest` — improving reliability against ad-blockers. A server-side PostHog client (`lib/posthog-server.ts`) is used for API route events. Users are identified on auth (signup and signin) using their Supabase user ID as the distinct ID, ensuring client and server events are correlated to the same person.

## Events instrumented

| Event | Description | File |
|---|---|---|
| `user_signed_up` | Fired when a new user successfully creates an account | `app/auth/page.tsx` |
| `user_signed_in` | Fired when an existing user successfully signs in | `app/auth/page.tsx` |
| `onboarding_started` | Fired when user clicks "Start Sync" on onboarding step 1 | `app/onboarding/page.tsx` |
| `onboarding_mood_selected` | Fired when user selects a mood option in step 2 (includes `mood` property) | `app/onboarding/page.tsx` |
| `subscription_plan_selected` | Fired when user initiates checkout for a plan (includes `plan` property) | `app/onboarding/page.tsx` |
| `onboarding_completed_free` | Fired when user skips subscription and continues free | `app/onboarding/page.tsx` |
| `checkout_initiated` | Server-side: fired when a Stripe checkout session is created (includes `plan`, `user_id`) | `app/api/stripe/checkout/route.ts` |
| `subscription_activated` | Server-side: fired on `checkout.session.completed` webhook (includes `plan`, `user_id`) | `app/api/stripe/webhook/route.ts` |
| `party_mode_toggled` | Fired when user turns Party Mode on or off (includes `active` boolean) | `app/party/page.tsx` |
| `party_status_updated` | Fired when user selects a new party status (includes `status`) | `app/party/page.tsx` |
| `party_checkin_sent` | Fired when user sends a live check-in to crew (includes `status`) | `app/party/page.tsx` |
| `crew_invite_accepted` | Fired when a user accepts a crew invite (includes `crew_name`, `inviter_name`) | `app/invite/[code]/page.tsx` |
| `profile_saved` | Fired when user saves profile settings (includes `ghost_mode`, `trusted_only`) | `app/profile/page.tsx` |

## Files created or modified

| File | Change |
|---|---|
| `instrumentation-client.ts` | Added PostHog init with `/ingest` reverse proxy host and exception capture |
| `next.config.ts` | Added PostHog reverse proxy rewrites for `/ingest/*` |
| `lib/posthog-server.ts` | New file — server-side PostHog client factory |
| `.env.local` | Added `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` |

## Next steps

We've built a dashboard and five insights to monitor user behavior as data flows in:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/463399/dashboard/1691834)
- [New Signups & Sign-ins](https://us.posthog.com/project/463399/insights/jITPzGpl) — Daily trend of `user_signed_up` vs `user_signed_in`
- [Onboarding Conversion Funnel](https://us.posthog.com/project/463399/insights/26RBfJDW) — Signup → Onboarding Started → Mood Selected → Plan Selected
- [Subscription Plan Selections](https://us.posthog.com/project/463399/insights/0xyCFJ1w) — `subscription_plan_selected` broken down by `premium` vs `party_pass`
- [Party Mode Engagement](https://us.posthog.com/project/463399/insights/0gDCtVc9) — Daily `party_mode_toggled`, `party_checkin_sent`, and `party_status_updated`
- [Crew Invite Acceptances](https://us.posthog.com/project/463399/insights/uqcE8DrF) — Unique users accepting crew invites per day

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
