# Testing Built Daily on your phone

Thanks for helping test the mobile app. It's an early build: it reads and
writes the **same account and the same workouts** as the website, so anything
you log here shows up there, and anything you logged there is already here.

Because it's real data, treat it as real — log actual workouts if you like, but
know that a bug could mean a workout saves wrong.

## 1. What you need first

An account on the website. Sign up there before you install the app, and use
the **same email and password** on your phone. (The app can create an account
too, but starting on the website means you'll have some history to look at.)

Sign-in is email and password only for now — "Continue with Google" isn't on
mobile yet, so if that's how you signed up on the web, ask for a password to be
set on your account first.

## 2. Getting the app

1. Install **Expo Go** — free, from the [App Store](https://apps.apple.com/app/expo-go/id982107779)
   or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent).
2. Ask Shane for the current link, then open it on your phone (or scan the QR
   code with your camera on iOS, or from inside Expo Go on Android).

The link only works while the development server is running, so it changes from
session to session. If it won't open, it's probably expired — ask for a fresh
one rather than assuming the app is broken.

## 3. What works on your phone today

- **Signing in and out** with an email and password.
- **Your recent workouts** — the 30 most recent, with anything still in
  progress pinned to the top.
- **Opening a workout** to see every exercise, every set, and a body chart of
  the muscles it worked.
- **Starting a workout**, either empty or from one of your saved plans.
- **Adding exercises** from the catalog, or by name if the catalog doesn't have
  the move.
- **Logging sets** — weight, reps, hold time, distance — plus notes on a set, on
  an exercise, or on the whole workout.
- **Finishing a workout**, which completes it and records how long it took.
- **Editing a workout** you logged anywhere, including on the web: its title,
  date, time, note, exercises and sets.
- **Browsing your plans** and **the exercise catalog**.

## 4. What's still website-only

Not bugs — these simply haven't been built on mobile yet:

- Creating or editing plans (you can run them on your phone, not change them).
- Activities like walks and bike rides.
- Progress charts, body weight, and your weekly goal.
- Groups, invites and public profiles.
- The planner / scheduled workouts.
- Google sign-in.

## 5. Rough edges to expect

- Weights are in pounds everywhere.
- Dates and times are typed in, as `2026-09-14` and `18:30`.
- There's no rest timer yet.
- A workout's duration is measured from when you started it to when you pressed
  finish, so it'll look long if you started one and wandered off.
- Changes save when you press **Save** — leaving a screen without saving loses
  what you typed on it.
- The app is a sandbox inside Expo Go, so it may be slower than a real app, and
  it will stop working when the development server does.

## 6. Telling us something is wrong

Open an issue on
[the repo](https://github.com/ShaneRich5/built-daily-mobile/issues/new?template=tester-feedback.md)
— the **Tester feedback** template asks for everything we need. If you'd rather
not use GitHub, message Shane with the same details.

The most useful report says **what you were doing, what you expected, and what
happened instead**, plus your phone and OS version. A screenshot is worth a lot.
If a workout saved wrong, say which one and what it should have been — don't
fix it on the website first, or there'll be nothing left to look at.

Please don't include your password in a report.
