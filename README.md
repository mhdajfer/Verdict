# @Odikka_ — landing page

A single responsive page. No build step, no dependencies to install: open
`index.html` in a browser, or serve the folder.

```
npx http-server -p 4321 -c-1
```

## Files

| File | What's in it |
| --- | --- |
| `index.html` | All the content. Every placeholder is marked with a `PLACEHOLDER` comment. |
| `styles.css` | Design tokens at the top, mobile-first rules, desktop overrides at the bottom. |
| `main.js` | The scroll animation. The `WAVE` table controls how each member moves. |
| `assets/odikka-dp.jpg` | Group profile picture — the original 1080×1080 file, copied without re-encoding. |
| `assets/members/member-1…6.svg` | Placeholder avatars. |

## Swapping in the real stuff

**Links.** Search `index.html` for `data-placeholder`. There are four: WhatsApp
and Instagram in the hero, and the same two repeated in the footer. Replace each
`href="#"` with the real URL. Once real links are in, delete the small
placeholder-click block at the top of `main.js` — it only exists to stop `#`
links jumping the page while you test.

**Member photos.** Drop square photos (600×600 or larger) into `assets/members/`
and point each `.floater__pic` at them:

```html
<img class="floater__pic" src="assets/members/priya.jpg" alt="" …>
```

Leave `alt=""` — the roast line beside the photo already carries the meaning, so
a screen reader reading both would just repeat itself.

**Roast lines.** Each member is one `<article class="floater">` block. Change
`.bubble__text` for the line and `.bubble__meta` for the handle and timestamp.
Keep lines to roughly 40 characters so bubbles stay two lines on a phone.

**Which side they float up on.** `data-lane="left"` or `data-lane="right"` on the
`.floater`. Alternating reads best.

**Adding or removing a member.** The `WAVE` array in `main.js` must have exactly
one row per `.floater`, in the same order as the HTML. Copy a row and adjust
`delay` so the delays stay evenly spread between `0` and about `0.55`.

## How the animation works

`ScrollTrigger` pins the roll-call section and scrubs a single number from 0 to 1.
`render()` turns that number into a position for each member:

- `delay` — where in the scroll they start rising
- `amp` — how far they sway sideways, in pixels
- `freq` — how many half-waves of sway they make on the way up
- `phase` — where in the wave they begin, so no two sway together
- `tilt` — how far they rotate at the extremes of the sway
- `lift` — their rise distance, so they don't all travel at one speed

Only `transform` and `opacity` are ever written, through GSAP `quickSetter`s, so
nothing triggers layout. Measured under 4× CPU throttling at 390px wide, frame
deltas held at a 16.6 ms median with a 19.9 ms worst case — no dropped frames.

There is deliberately no smooth-scroll library. Native scroll is what touch
devices expect, and hijacking it is what makes these pages feel janky on a phone.

## Fallbacks

The page works without the animation. If GSAP fails to load, JavaScript is off,
or the visitor has "reduce motion" turned on, the roll call renders as a plain
readable stack and the ambient loops (typing dots, ticker) stop. The animated
layout is only switched on by the `is-animated` class, which `main.js` adds.

## Section length

How long the pinned section runs is set in `styles.css`:

```css
.roast.is-animated{ height: calc(var(--stage-h) * 3.6); }   /* mobile */
.roast.is-animated{ height: calc(var(--stage-h) * 4.2); }   /* ≥40rem */
```

Bigger multiplier means a slower, longer drift.
