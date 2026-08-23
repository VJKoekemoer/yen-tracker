# Yen Tracker — Japan, 5–24 October 2026

An offline expense tracker for your trip. Everything is stored on your own phone, so it
works on a train through the Alps with no signal. Nothing is sent anywhere unless you
tap the backup button yourself.

---

## Getting it onto your phone

You do this once, and it takes about five minutes. You need a computer for step 1 and
your phone for step 3.

### 1. Put the files online

The app has to live at a proper web address before Android will let you install it as a
real app. The easiest free way:

1. On your computer, go to **https://app.netlify.com/drop**
2. Sign in (free — Google or email is fine)
3. Drag this whole **`yen-tracker`** folder onto the page
4. Wait a few seconds. You'll get an address like `graceful-otter-1a2b3c.netlify.app`

That address is now yours permanently. Write it down.

> If you'd rather rename it to something memorable, Netlify's **Site settings → Change
> site name** lets you pick, e.g. `vicky-japan.netlify.app`.

### 2. Open it on your phone

Type that address into **Chrome** on your Android phone.

### 3. Install it

Chrome will offer an **"Install app"** banner at the bottom. Tap it.

If no banner appears, tap the **⋮** menu (top right) → **Add to Home screen** →
**Install**.

You'll now have a Yen Tracker icon in your app drawer. It opens full-screen with no
address bar, and works with the phone in flight mode.

### 4. Before you fly

Open the app while you still have wifi and go to **Data → Rates & fees**:

- Tap **Refresh rates from the internet** — this caches the exchange rates so they work
  offline for the whole trip
- **Check the three fee percentages against your actual bank terms.** I've put in
  2.75% for FNB debit and credit and R85 for the ATM fee, based on your cash strategy
  note, but please confirm with FNB and Standard Bank. Every rand figure in the app
  depends on these being right.
- When you're done testing, use **Clear all entries and start fresh**

---

## How to use it

### Add tab — logging a spend
Tap the amount on the keypad, pick a category and which money it came out of, hit Save.
Three taps for most things. The date and city fill themselves in from your itinerary,
and you can override the city if you're out on a day trip.

Underneath the amount it shows you what that spend actually costs you in rands — using
the real cost of the specific cash in your pocket, not a textbook exchange rate.

### Cash tab — the money itself
- **ATM withdrawal** — record what came out and, if you can check your banking app,
  what the bank actually took off your account. An exact figure makes everything else
  exact. If you leave it blank it estimates from your fee settings.
- **Change USD → yen** — for the dollars you were given. It tells you what rate you
  actually got versus the market rate, so you can tell whether a counter is ripping
  you off before you change the rest.
- **Add cash on hand** — record the gifted US dollars here when you set off. Mark them
  as a gift and they cost you R0, which keeps them out of your "own pocket" total while
  still counting as money spent.

There's also a **cash runway**: once you've logged a few days it works out your daily
yen burn and tells you roughly when you'll need another ATM.

### Stats tab
Totals broken down by category, by day, by city, and by which card or cash it came from.

Two headline numbers:
- **Spent so far** — the market value of everything you've bought
- **Out of your pocket** — what it genuinely cost you, including ATM fees, card
  conversion margins, and excluding the gifted dollars

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

### Data tab — backups
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

## Two shortcuts for trying it out

Add these to the end of the address when you want to reset things while testing.
They work on the live Netlify address too, not just locally.

| Address | What it does |
|---|---|
| `.../?reset` | Wipes all entries and starts you with an empty book. Keeps your exchange rates and fee settings. |
| `.../?demo` | Loads a sample five days of the trip — the gifted dollars, the Changi and KIX withdrawals, seventeen spends. Only ever fills an **empty** app, so it can't overwrite real entries. |

So `vicky-japan.netlify.app/?demo` shows you a populated app, and `?reset` clears it again.
Once the trip starts you'll just use the plain address and never think about these again.

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

After changing anything, re-drag the folder onto Netlify **and** bump the version
string at the top of `sw.js` (`yen-tracker-v1` → `v2`), otherwise phones will keep
serving the old cached copy.
