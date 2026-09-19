# Yen Tracker — Japan, 5–25 October 2026

An offline expense tracker for your trip. Everything is stored on your own phone, so it
works on a train through the Alps with no signal. Nothing is sent anywhere unless you
tap the backup button yourself.

---

## Getting it onto your phone

You do this once, and it takes about five minutes. You need a computer for step 1 and
your phone for step 3.

### 1. Put the files online

The app has to live at a proper `https://` address before Android will let you install
it as a real app — a file opened from your hard drive doesn't count, and won't work
offline. This folder is already a git repository, so:

1. On **github.com**, click **+ → New repository**
2. Name it `yen-tracker`, leave it **Public**, and add **nothing** — no README, no
   .gitignore, no licence. The repository must start empty.
3. Back on your computer, in this folder:

```
git remote add origin https://github.com/VJKoekemoer/yen-tracker.git
git push -u origin main
```

4. In the repository, go to **Settings → Pages**. Under *Build and deployment*, set
   **Source: Deploy from a branch**, **Branch: main**, **Folder: / (root)**. Save.
5. Wait a minute or two, then visit:

```
https://vjkoekemoer.github.io/yen-tracker/
```

That address is yours permanently. Write it down.

> The repository is public, which is what makes GitHub Pages free. There's no spending
> data in it — your entries live on your phone and in your Drive backups, never here.
> What *is* public is your travel dates and route, since they're built into the app.

### 2. Open it on your phone

Type that address into **Chrome** on your Android phone.

### 3. Install it

Chrome will offer an **"Install app"** banner at the bottom. Tap it.

If no banner appears, tap the **⋮** menu (top right) → **Add to Home screen** →
**Install**.

You'll now have a Yen Tracker icon in your app drawer. It opens full-screen with no
address bar, and works with the phone in flight mode.

### 4. Before you fly

Open the app while you still have wifi and go to **Backup → Rates, fees and budget**:

- Tap **Refresh rates from the internet** — this caches the exchange rates so they work
  offline for the whole trip
- **Check the three fee percentages against your actual bank terms.** I've put in
  2.75% for FNB debit and credit and R85 for the ATM fee, based on your cash strategy
  note, but please confirm with FNB and Standard Bank. Every rand figure in the app
  depends on these being right.
- Check the **budget** — R1,500 a day, R750 on the first and last days
- When you're done testing, use **Clear everything and start fresh**

---

## How to use it

Six tabs, each with one job:

| Tab | What it's for |
|---|---|
| **Add** | Logging a spend |
| **Cash** | The money in your pocket, and recording cash you've just got |
| **Spending** | Where your money went, and how you're doing against the budget |
| **Entries** | Every entry in its own currency and in rands, and what each card has taken off your account |
| **Notes** | Anything the app doesn't cater for |
| **Backup** | Backing up, exporting, and settings |

### Add — logging a spend
Tap the amount on the keypad, pick a category and which money it came out of, hit Save.
Three taps for most things. The city fills itself in from your itinerary, and you can
change it if you're out on a day trip.

The date follows today. Use the **‹ ›** arrows to step a day back or forward — handy for
last night's dinner — or tap the date to jump to any day of the trip. It goes back to
today on its own the next morning.

Underneath the amount it shows you what that spend actually costs you in rands — using
the real cost of the specific cash in your pocket, not a textbook exchange rate. The
strip at the top shows how that day is going against your daily budget; tap it to see
the whole trip.

### Cash — the money in your pocket
Your yen, big, with roughly how many days it will last at your pace. Singapore and US
dollars appear underneath only while you're holding some.

When you've got cash, tap **I got cash** and it asks how:
- **From an ATM** — record what came out and, if you can check your banking app, what
  the bank actually took off your account. An exact figure makes everything else exact.
  If you leave it blank it estimates from your fee settings.
- **At a money changer** — for the dollars you were given. It tells you what rate you
  actually got versus the market rate, so you can tell whether a counter is ripping you
  off before you change the rest.
- **I brought it or was given it** — record the gifted US dollars here when you set off.
  Mark them as a gift and they cost you R0, which keeps them out of your "own pocket"
  total while still counting as money spent.

### Spending — where it went
The **budget card** at the top shows what you've spent so far against your budget — R1,500
a day, and R750 on the first and last days (5 and 25 October) since those are mostly
spent travelling (R30,000 for the whole trip) — how far over or under you are, and what you can spend each
day for the rest of the trip to finish on budget. It counts only **your own money**: anything paid for with the gifted
dollars doesn't count, whether you spend them as dollars or change them into yen first.
Once gift yen and ATM yen are mixed in your purse, each spend counts only its paid-for
share. ATM fees and card fees do count, because that's your money too. Change the
figure, or set it to 0 to hide it, under Backup → Rates, fees and budget.

Everything on the Spending tab measures that same thing — **my own money** — so every
figure on it adds up to the same total as the budget card.

**How it adds up** shows what that total is made of:

> Money spent excl. USD and fees **R2,660**
> + bank fees and exchange costs **R118**
> = **My own money R2,778**
>
> Also paid for with the gifted USD, not counted: R349

(Figures from the sample trip.) The fees line is the ATM fees and card conversion margins
on what you've spent so far; fees on cash still in your pocket join it as you spend that
cash. The gifted-USD line sits outside the sum, since that spending never touched your
own money.

Below that, the same total broken down by category, by day (each day measured against
its budget), by city, and by what you paid with.

That's why a day's figure here can be lower than what the Entries tab says you spent
that day: Entries shows what everything was worth, Spending shows what it cost you.

The app itself talks in the first person — "my money", "my pocket" — since you're the
only one using it.

### Entries — everything you've logged
Every entry, newest first, grouped by day. Each line shows the amount in the currency
you paid in, with the rand figure underneath. Filter to just **Spends** or just
**Money in**; tap ✕ to delete a mistake.

At the top, **Off your accounts** shows what each card has taken off its account —
taps plus cash drawn. That's the number to check against your banking app.

### Notes tab — the escape hatch
For anything the app has no box for. A cost someone else covered that you'll settle up
later, a receipt worth keeping, an ATM that refused your card, a rate that looked wrong,
something to sort out when you're home.

Every note is stamped with the date and the city you were in, and they're saved with
everything else — they go into your Drive backups and appear at the bottom of the
spreadsheet export. Tap ✎ to add to a note later, ✕ to delete it.

It exists because you won't have a laptop with you. If the trip throws up something this
app didn't anticipate, write it down here rather than trying to force it into a category
that doesn't fit.

### Backup — keeping a copy safe
**This is the important one.** The app keeps everything on your phone. If the phone is
lost or wiped, so is the data.

- **Back up to Drive** — opens the Android share sheet. Pick **Drive** and it saves a
  dated file. Do this every couple of days; the app nags you with a yellow stripe if
  it's been more than two.
- **Export spreadsheet (CSV)** — opens in Excel or Sheets, if you want to slice it up
  properly when you're home.
- **Restore from backup file** — point it at a `.json` backup to bring everything back
  on a new phone.

---

## Why the rand figures look the way they do

A yen is not a yen.

Yen you pull out of a Seven Bank ATM cost you the exchange rate *plus* an FX margin
*plus* an R85 flat fee. Yen you get by converting the dollars you were given cost you
nothing at all. So when you buy a ¥600 coffee, what that actually costs you depends
entirely on which pile of yen it came from.

The app tracks a running blended cost for each cash wallet and charges every spend at
the real rate at that moment. That's why the ATM screen tells you what each ¥1 in your
pocket cost, and why the fee report can show you exactly what the convenience of cash
is costing you versus tapping your card.

It's also the honest argument for your own strategy: withdraw large, withdraw rarely,
tap wherever they'll let you, and always, always choose to be charged in yen.

---

## Trying it out before the trip

In the app: **Backup → Rates, fees and budget**, and scroll to the bottom.

- **Load a sample trip to play with** — fills the app with five made-up days so you can
  see how it all behaves. Only works on an empty app, so it can't overwrite real entries.
- **Clear everything and start fresh** — wipes entries and notes, keeps your rates and
  fee settings. Do this once, just before you fly.

Play with it as much as you like. Nothing you enter now can survive that Clear button.

### The same two, from the address bar

If you're testing in a browser rather than the installed app, these do the same thing.
They won't work from the installed app, which has no address bar.

| Address | What it does |
|---|---|
| `.../?reset` | Wipes all entries and starts you with an empty book. Keeps your exchange rates and fee settings. |
| `.../?demo` | Loads a sample five days of the trip — the gifted dollars, the Changi and KIX withdrawals, seventeen spends. Only ever fills an **empty** app, so it can't overwrite real entries. |

So `vjkoekemoer.github.io/yen-tracker/?demo` shows you a populated app, and `?reset`
clears it again. Once the trip starts you'll just use the plain address and never think
about these again.

## If you need to change something

The whole app is four files:

| File | What it is |
|---|---|
| `index.html` | The screens |
| `app.js` | All the logic — wallets, cost basis, stats, backup |
| `styles.css` | Appearance (it follows your phone's light/dark setting) |
| `sw.js` | The bit that makes it work offline |

Your itinerary is the `ITIN` block near the top of `app.js`, and the cities list is
right below it. If the route changes, edit those.

After changing anything, **bump the version string at the top of `sw.js`**
(`yen-tracker-v2` → `v3`) and then push:

```
git add -A
git commit -m "what you changed"
git push
```

GitHub Pages republishes within a minute or two. The version bump matters: it's what
tells phones their cached copy is stale. Skip it and your phone will happily keep
running the old app for weeks, which looks exactly like the update having failed.

Because the code lives on GitHub, a fix can be pushed from any computer — useful if
something goes wrong while you're travelling without a laptop.
