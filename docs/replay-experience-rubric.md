# Duel replay experience rubric

Used to score how engaging a duel page is to watch, both live and as a replay
by someone who opened a shared link. An evaluator sub-agent applies it so the
analysis can be repeated after each change. Scores are 0 to the category
maximum; total is out of 100.

## Categories

| # | Category | Max | What earns full marks |
| - | -------- | --- | --------------------- |
| 1 | Pacing and viewer control | 20 | A first-time viewer sees one round at a time and decides when to move on. Advancing is one obvious tap. Skipping ahead or showing everything is possible but not the default. Nothing new appears while the viewer is still reading. |
| 2 | Reveal drama | 20 | Each round enters in stages that build anticipation: both spells, then the luck rolls, then the illustration, then the result, then the damage. Timing is quick enough not to bore (roughly 4 to 7 seconds before the result is fully shown) and can be skipped. |
| 3 | Suspense and spoiler safety | 15 | Nothing on screen gives away later rounds or the winner before the viewer reaches them: health bars, points, the round timeline, status badges, collapsed summaries and the result banner all reflect only what has been revealed. |
| 4 | Narration and reading flow | 15 | The announcer narration starts when a round is revealed (when the browser allows), can be replayed per round, and the written text is easy to find. A viewer can re-watch a single round's reveal. |
| 5 | Deliberate transitions (mobile focus) | 15 | No jarring pop-ins or layout jumps on a 390px-wide screen. For a player, the spell composer appears only after they choose to move on from the round they're reading, not the instant the next round opens. Scrolling follows the action without yanking the viewer away. |
| 6 | Orientation | 10 | The viewer always knows which round they're on, how many remain, and what the next action is. The end of the duel is a clear payoff that leads to the result and a next step (share, rematch, create a wizard). |
| 7 | Polish and accessibility | 5 | Respects reduced motion, works by keyboard, no console errors, no visual glitches. |

## Evaluator procedure

1. Open the duel URL in a fresh browser context (clear `localStorage` for the
   origin) as a signed-out spectator.
2. Mobile pass: emulate a 390x844 viewport. Load the page, take a screenshot,
   then step through the duel the way a new viewer would. During one round
   reveal, take screenshots about 0.5s, 2s and 5s after starting it.
3. Desktop pass: 1280x900, same steps, more briefly.
4. Check spoilers at each step: compare the scoreboard and timeline against the
   rounds actually shown.
5. Read the relevant source to judge the live player flow (composer timing),
   which a signed-out viewer can't exercise: `src/app/duels/[id]/DuelPageClient.tsx`,
   `src/components/DuelRoundCard.tsx`, `src/components/CastSpellModal.tsx`,
   `src/components/NarratedText.tsx` and any replay components they import.
6. Report a score per category with one or two sentences of evidence each, the
   total, and the three changes that would raise the score the most, ordered by
   impact. List concrete bugs separately.
