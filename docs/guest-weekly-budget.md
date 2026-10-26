# Guest weekly percentage estimate

The requested policy is 25 percentage points of the Codex account's weekly
allowance for all guests combined, and 5 points per browser. The browser limit
is not 5% of the guest pool. Owners do not pass through the quota gate.

## Measurement and persistence

- Only the RISE inference client's `account/read` and `account/rateLimits/read`
  are used. A nonempty `workspaceRouting.chatgptAccountId` must match the usage
  response's `accountId`. Missing or mismatched identity blocks guest inference.
  Desktop-app usage snapshots are never imported.
- The `codex` bucket must have exactly one 10,080-minute window, in either
  primary or secondary. The backend reset timestamp defines the week.
- Read a baseline immediately before dispatch and up to three snapshots after
  the turn, 1.5 seconds apart. Charge the observed percentage-point difference.
  Fresh equal integers are valid sub-percent estimates, not telemetry failures
  and not a one-point minimum per question.
- A subsequent guest preflight can reconcile delayed growth for the preceding
  guest for up to two minutes. Outside that bounded interval, ordinary idle
  account usage is not charged to guests. Unknown external concurrent usage can
  still contaminate an estimate, and later reflection can be missed. The backend
  does not supply a measurement timestamp, so a fresh RPC is not proof of zero
  upstream reporting delay.
- Persist `.rise-private/guest-weekly-budget.json` with the existing atomic JSON
  writer. A request ID is charged once. An exclusive sidecar lock prevents two
  guest requests/processes from overlapping. There is no fixed token cap.
- Failures and interruptions retain their consumed estimate or a pending record.
  Missing/stale samples are never synthesized as zero. A fresh matching sample
  within two minutes can reconcile a transient missing result, including equal
  integers. Interrupted processes, expired uncertainty, a changed account/window,
  or known RISE owner overlap remain on hold for review or the next verified week.
- Owners always remain usable. A guest cannot begin while a known RISE owner turn
  is active. If an owner begins during a guest measurement, no mixed delta is
  assigned to the guest; that incomplete measurement is held. This conservative
  case cannot be resolved automatically from aggregate percentages alone.
- No new guest request starts in the last 18 minutes of a weekly window (the
  existing response timeout is 15 minutes). A verified new window gets new
  counters while historical records are retained. Unexpected early reset changes
  are held instead of silently granting another pool.
- The first partial week counts usage after activation only; earlier guest usage
  cannot be reconstructed from account-wide percentages.

This is an estimate, not an exact quota, hard in-flight stop, or reservation of
75% for the owner. An active answer can exceed either threshold. Subsequent guest
answers are then rejected. Normal readings that remain unchanged may still hide
sub-percent consumption or delayed upstream reporting; this limitation is shown
as an estimate and is not represented as exact measurement.

## Browser identity

The existing device-token record stores a server-generated browser ID distinct
from the guest/history ID. Token rotation preserves it; recovery in another
browser does not adopt the source browser's budget. Clearing all browser data
creates a new individual budget but cannot erase the shared server-side total.
The common password cannot prevent someone from creating additional browser
identities. Public browser keys are non-authentication hashes used only to avoid
displaying another recovered browser's individual usage as one's own.

## Activation

The feature is opt-in; activation is stored only in the PC's private configuration.
Before enabling, use a permitted RISE-dedicated read-only connection to verify
both account IDs, the weekly bucket, and fresh usage responses. Do not substitute
the desktop app's account information if this check fails. If the CLI does not
expose both matching IDs, do not enable this implementation.

After verification, back up code and the existing private configuration in a
private location. Preserve every existing setting and credential. The only new
configuration member needed is:

```json
"guestWeeklyBudget": {"enabled": true, "limitId": "codex"}
```

Do not copy the private configuration, auth cache, budget ledger, or lock into
Git or public assets. Build and validate the frontend with the existing scripts,
review only this change's diff, and use the existing deployment workflow. Wait
for active answers to finish before gracefully updating the existing bridge.
Require guests with old sessions to log in again to obtain browser budget IDs.
Verify one inexpensive guest response, the estimate notice, owner exemption,
published build version, and running server code. Threshold exhaustion is covered
by fixtures; do not spend 25%/5% for a production test.

Rollback: disable only `guestWeeklyBudget.enabled` and restore the backed-up
changed code/build using the existing restart procedure. Retain the budget ledger
for audit; deleting it grants a fresh pool. Never delete a lock while its owning
process may still run. A stale lock or unresolved usage needs an operator to
inspect the ledger and active process; this patch does not invent consumption or
erase the uncertainty automatically.

## Verification (2026-10-26)

- 29 focused tests passed: ledger, reset, concurrency, duplicate charging, fresh unchanged
  values, delayed values, outage/recovery, owner exclusion, provider integration,
  both cookie and Pages-bearer request handlers, browser recovery, and existing
  input/Codex/plugin checks. Handler tests use an injected in-process server and
  do not claim to verify real HTTP transport.
- After the user moved the work to the permitted local execution environment,
  a read-only probe through the RISE-dedicated Codex client succeeded. Both IDs
  were available and equal, and the `codex` primary window was 10,080 minutes.
  This probe created no turn and did not change login credentials.
- Real loopback HTTP tests now run successfully. The complete Node suite passes
  173 tests. Fourteen Chromium interaction groups pass with real HTTP and the
  service worker, including the guest estimate disclosure, compact phone UI,
  role separation and offline history. AI responses in these UI tests are fixtures.
- Browser cancellation previously closed Codex before settlement, losing the
  final usage read. Cancellation now requests interruption, settles usage with
  the same authenticated client, then closes it. A regression test requires the
  consumed estimate to persist and the next guest request to remain usable.
- Deployment and activation require the production checks described above;
  synthetic threshold tests do not consume the real 25% or 5% budget.

The chat shows a compact, initially collapsed usage disclosure. It is absent for
owners and uses only the current browser's last observed record. The server makes
the current admission decision; the displayed conversation snapshot is not a
live balance or an additional permission granted by the browser.

Protocol reference: [Codex App Server](https://learn.chatgpt.com/docs/app-server).

Run the network-free suite with the installed Node 24 runtime and a permitted
temporary directory:

```text
node --test tests/rise-guest-budget.test.mjs tests/rise-guest-budget-provider.test.mjs tests/rise-guest-budget-handler.test.mjs tests/rise-provider.test.mjs tests/rise-codex.test.mjs tests/rise-chat-plugins.test.mjs
```
