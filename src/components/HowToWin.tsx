import { Heart, Swords, Skull, Trophy, Scale, Sparkles } from "lucide-react";
import { TO_THE_DEATH_MAX_ROUNDS } from "../../convex/lib/pricing";
import { HEALING, HIT_DAMAGE } from "../../convex/lib/duelJudging";

const WAYS_TO_WIN = [
  {
    icon: Skull,
    title: "Knockout",
    text: "Drop your rival to 0 health and you win on the spot.",
  },
  {
    icon: Trophy,
    title: "Most health",
    text: "Both still standing after the last round? Whoever has more health left wins.",
  },
  {
    icon: Scale,
    title: "Tiebreaker",
    text: "Health exactly tied? Whoever won more rounds wins. Tied on both? It's a draw.",
  },
];

const HIT_TIPS = [
  "Be specific: “a swarm of lightning bees” beats “I attack”",
  "React to your rival's last move",
  "Don't repeat the same spell: it works less well each time",
  "Just blocking gives your rival a free shot",
];

/**
 * The scoring rules in plain, playful language. Mirrors
 * checkDuelEndConditions in convex/duels.ts.
 */
export function HowToWin() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card/60 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Heart className="size-4 text-success" aria-hidden="true" />
            Health is the score
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone starts with 100. Hit 0 and you&apos;re knocked out.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Swords className="size-4 text-gold" aria-hidden="true" />
            Better magic hits harder
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The judge decides whose spell wins each clash. A graze costs{" "}
            {HIT_DAMAGE.graze}, a solid hit {HIT_DAMAGE.solid} and a devastating
            blow {HIT_DAMAGE.devastating}. Luck tips close calls.
          </p>
        </div>
      </div>

      <ol className="space-y-3">
        {WAYS_TO_WIN.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{title}.</span>{" "}
              {text}
            </p>
          </li>
        ))}
      </ol>

      <p className="rounded-lg border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Healing works.</strong> A healing
        spell wins back {HEALING.minor} or {HEALING.major} health, but you still
        take whatever your rival lands that round, so heal when it&apos;s worth
        more than an attack.
      </p>

      <div className="text-sm text-muted-foreground">
        <p className="mb-1 flex items-center gap-2 font-semibold text-foreground">
          <Sparkles className="size-4 text-gold" aria-hidden="true" />
          Land bigger hits
        </p>
        <ul className="list-disc space-y-0.5 pl-5">
          {HIT_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        To the Death duels stop at {TO_THE_DEATH_MAX_ROUNDS} rounds. If nobody
        has fallen by then, more health wins.
      </p>
    </div>
  );
}
