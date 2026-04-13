# Membership expiry — how it works (simple guide)

This file explains the **current** flow in plain language, **line by line** for the main code, and **what was fixed** compared to the old version.

---

## 1. Big picture (no code)

1. A gym **member** has a row in **`Member`** (name, branch, `membership.startDate`, `membership.endDate`, etc.).
2. Extra billing/plan info lives in **`MembersPersonalDetails`** (“Details”): `membership_start_date`, `membership_end_date`, and optional **`subscriptionPeriods`** (list of paid segments: start + end).
3. **Once when the Node process starts**, before the HTTP server accepts connections, the same job runs so **that calendar day’s** expired vs active state is synced first. **Every 4 hours** afterward (while the process stays up) it runs again.
4. The batch job:
   - Finds people whose **stored end date on Details** is **before start of today** (local server day) **or** whose **Member end date** is before start of today.
   - If **`subscriptionPeriods`** says they still have a **current** or **next** paid segment, it **updates the dates** on both documents (repair or move to next period).
   - If there is **no** valid segment left, it marks the member **inactive** (or **long term inactive** if the end date is very old).
5. When someone tries to enter the gym (check-in API), another function reads **`Member`** only and says yes/no — that is **`checkMembershipStatus`** in `middleware/membershipValidation.js` (not repeated line-by-line here; it checks active flag, dates, frozen gym).

---

## 2. When does the job run? (`index.js`)

File: `index.js` (membership block near the bottom).

| Step | What it does |
|------|----------------|
| Wrapper | **`checkExpiredMemberships`** — if MongoDB is not connected, returns; else logs, **`await`** **`Member.checkAndUpdateExpiredMemberships()`**, logs result. The model returns **`asOfLocalDate`** (YYYY-MM-DD in the **server’s local timezone**) matching the **start-of-day** cutoff used for “expired before today.” |
| After DB + token init | **`await checkExpiredMemberships()`** runs **before** **`app.listen`**, so the first HTTP request sees the DB already swept for **that local calendar day**. Errors are caught inside the wrapper (logged only), so startup still reaches **`app.listen`**. |
| After listen | **`setInterval(checkExpiredMemberships, 4h)`** — repeats while the process stays up. |

---

## 3. Line by line: `utils/subscriptionPeriods.js`

This file answers: **“Given a list of paid periods and a moment in time, where are we?”**

| Line | What it does |
|------|----------------|
| 13 | Function **`getCurrentPeriodForDate(subscriptionPeriods, now)`** starts. |
| 14 | If `subscriptionPeriods` is missing or empty → return **`null`** (no multi-period plan). |
| 15–22 | Build **`sorted`**: copy the array, drop bad items, turn dates into real `Date` objects, drop items with no end date, **sort by start date** (earliest first). |
| 23 | If nothing left after cleaning → **`null`**. |
| 24 | Loop through each period **from earliest to latest**. |
| 25 | If **`now`** is **on or after start** and **on or before end** → member is **inside** this paid segment → return that segment and **`isActive: true`**. |
| 26 | If **`now`** is **before** this segment’s start → the next segment is “not started yet” → return that segment and **`isActive: false`**. |
| 28–29 | If the loop never returned, **`now`** is **after every segment** → return the **last** segment’s dates and **`isActive: false`** (all periods finished). |
| 32–34 | Export the function so **`memberController`** and **`Member`** model can use the **same** rules. |

---

## 4. Line by line: `Member.checkAndUpdateExpiredMemberships` (`models/member.js`)

File: `models/member.js` (about lines 160–281).

| Line(s) | What it does |
|--------|----------------|
| 160 | Start the static method (runs on the **Member** model). |
| 162 | Load **`getCurrentPeriodForDate`** from `utils/subscriptionPeriods.js`. |
| 163 | **`now`** = exact current date-time. |
| 164–165 | **`today`** = same calendar day but **00:00:00** (used for “before today” queries). |
| 166 | **`asOfLocalDate`** = YYYY-MM-DD string in **server local timezone** (returned for logs / API). |
| 167 | Load **Details** model (`MembersPersonalDetails`). |
| 169 | **`skipStatuses`**: member statuses we **do not** auto-change (`suspended`, `inactive`, `long term inactive`). |
| 171–181 | **`syncActiveWindow`**: writes **`periodStart`** and **`periodEnd`** to **Details** (`membership_start_date`, `membership_end_date`) and to **Member** (`membership.startDate`, `membership.endDate`), sets membership **active** and member **status `active`**. |
| 187–204 | **`considerDetailAndMember(detail, memberDoc)`**: one member’s decision. |
| 188 | If there is **no member row**, or status is in **skip** list → do nothing (no advance, no inactive). |
| 189 | If role is set and **not** `member` (e.g. trainer) → do nothing. |
| 191 | Read **`subscriptionPeriods`** from this Details row. |
| 192–201 | If there is a non-empty periods array: call **`getCurrentPeriodForDate`**. If **inside** a period OR **before next** period starts → **`syncActiveWindow`** and return **advanced**, not inactive. |
| 203 | Otherwise → return **inactive: true** (no valid segment to stay on). |
| 206–207 | Counters: how many windows we fixed/advanced; **Set** of member IDs to mark inactive (no duplicates). |
| 209–212 | **Phase 1 — Details query:** find all **Details** where `membership_end_date` is **strictly before today midnight** and `membership` field exists. |
| 214–221 | For each: load **Member**; run **`considerDetailAndMember`**; count advances; if result says inactive and member is allowed, add member id to the **inactive set**. |
| 223–230 | **Phase 2 — Member query:** find **Members** with `role: 'member'`, still “active” status-wise, **`membership.isActive` true**, and **`membership.endDate` before today midnight** — catches people **missed** in phase 1 (no Details, or dates out of sync). |
| 232–234 | For each: if already in inactive set, **skip**. |
| 236–240 | Load **Details** by `memberId`. If missing or no `membership` → **inactive** (cannot resolve plan). |
| 242–248 | If Details **`membership_end_date`** is still **today or future** but Member was wrong → **copy dates from Details to Member** only (repair). |
| 251–253 | Else run **`considerDetailAndMember`** again; advance or add to inactive set. |
| 256 | Turn the set into an array. |
| 258–261 | Load those **Member** documents again (still skip suspended / inactive / long term inactive). |
| 263 | **`ninetyDaysAgo`** = now minus 90 days. |
| 264–268 | For each: if **`membership.endDate`** is **older than 90 days ago** → status **`long term inactive`**, else **`inactive`**; set **`membership.isActive`** false; **save**. |
| 271–277 | Return **`success`**, **`asOfLocalDate`**, counts, and **`message`** for logging (and manual **`/check-expired-memberships`** API). |
| 277–280 | On error: log and rethrow. |

---

## 5. What was wrong before (old behaviour)

These were the **problems** in the **previous** version of the expiry job (before the fix):

1. **Wrong “next period”**  
   The old code used something like: first period in the array where `endDate > now`.  
   That is **not** the same as “the correct next segment in date order.” If the array was not sorted, it could pick the **wrong** period.

2. **Two different brains**  
   Renewals in **`memberController`** used **sorted** periods and careful logic.  
   The expiry job used a **different** rule. So the same member could be handled **two different ways**.

3. **Only Details drove the job**  
   If **`Member.membership.endDate`** was expired but **Details** was fine (or missing), the job could **miss** the member or leave bad data.

4. **Suspended members**  
   The job could still try to mark people **inactive** in ways that did not respect **suspended** as a special admin state.

5. **Trainers**  
   The old loop did not clearly limit work to **paying gym members** only.

---

## 6. What we fixed (summary)

| Topic | Fix |
|--------|-----|
| **One rule for periods** | Moved sorting + “where is `now`?” into **`utils/subscriptionPeriods.js`**. Both renewals and the job use it. |
| **Next period / repair** | The job now uses **`getCurrentPeriodForDate`**: if `now` is **inside** a segment, it **syncs** dates; if `now` is **before** the next segment, it **syncs** to that upcoming window; if all periods are **past**, it goes **inactive**. |
| **Member-only problems** | **Phase 2** finds members with **expired `Member.membership.endDate`** and repairs from Details or marks inactive. |
| **Suspended / inactive** | **`skipStatuses`** and queries avoid auto-changing **suspended** and already **inactive** members. |
| **Trainers** | Only **`role: 'member'`** is processed in the decision function. |

---

## 7. Files to read in the repo

| File | Role |
|------|------|
| `utils/subscriptionPeriods.js` | Defines **`getCurrentPeriodForDate`**. |
| `models/member.js` | **`checkAndUpdateExpiredMemberships`** — the scheduled expiry job body. |
| `index.js` | **`checkExpiredMemberships`** + **`setInterval`** — when the job runs. |
| `middleware/membershipValidation.js` | **`checkMembershipStatus`** — live “can this member use the gym?” check from **Member** only. |

If you want this doc moved (e.g. under `docs/`), say where you prefer it.

---

## 8. Scheduling: “once that day when someone uses the app” vs fixed interval

**Idea:** run the batch job **once per calendar day**, triggered the **first time** the API is used after midnight (or first request after deploy).

| Approach | Pros | Cons |
|----------|------|------|
| **First request of the day** | No timer; feels tied to “real usage.” | Easy to **miss a day** if nobody hits the API (DB can stay stale until the next hit). Harder to reason about in tests and ops. |
| **On server start + every 4 hours** (current in `index.js`) | Runs after **cold start** (e.g. GCP waking the instance) and **periodically** while the process is up. Simple and predictable. | If the platform **stops the process** between runs, only the **next start** or **next interval** while running will sync—same limitation as any in-process scheduler. |
| **External cron** (e.g. Cloud Scheduler → HTTPS) | **Guaranteed** daily/hourly regardless of traffic or sleep. | Extra infra and a secured endpoint. |

**Every 4 hours** is enough for **DB consistency** (reports, lists) as long as you still rely on **`checkMembershipStatus`** at the door for **access**. **Once per day on first use** is acceptable only if you accept **zero-traffic days** leaving batch state unchanged until the next traffic day.
