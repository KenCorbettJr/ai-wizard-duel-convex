# Duel teaser videos

Short vertical trailers (YouTube Shorts) of popular duels. Each teaser builds
up the duel and stops before the deciding round, then ends on "Go to AI Wizard
Duel to see how it ended!" Nothing is posted until an admin approves it on
**/admin/teasers**, and approved teasers also appear on their duel page.

## How it works

1. **Pick.** Every day at 13:00 UTC, `teasers.pickDailyDuel` scores duels that
   finished in the last 36 hours (viewers, peak onlookers and the AI rating)
   and picks the best one that has at least two illustrated rounds before the
   ending. Admins can also make a teaser for any duel from the admin page.
2. **Draft** (`convex/teaserMedia.ts`). Gemini writes a trailer script from the
   build-up only. It never sees the deciding round, the conclusion or the
   winner. Each line is voiced by the same narrator voice as the duels, in a
   trailer style. With **AI motion** on, each round picture also becomes a
   short clip made by Gemini Omni Flash (about $0.07 a second, so about $1 a
   teaser). If a clip fails, the still picture is used instead.
   Lyria 3.5 also writes a background track to fit the duel's mood (about
   $0.08). If that fails, the bundled `public/music/fallback.mp3` plays.
3. **Render.** Convex starts the `Render teaser` GitHub Actions workflow, which
   renders this Remotion project and uploads the MP4 back to Convex.
4. **Review.** Admins get a notification. On /admin/teasers you can watch it,
   edit the title and description, then approve, reject, or redo it (with or
   without AI motion).
5. **Publish.** Approving posts it to YouTube (if connected) and shows it on
   the duel page. Without YouTube connected, approve it for the duel page,
   download it, upload it by hand, and paste the link back.

## Setup

### Convex environment variables

| Variable                                                              | What it's for                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `TEASERS_ENABLED`                                                     | `true` turns on the daily pick. Leave it off in dev.                      |
| `TEASER_AI_MOTION`                                                    | `true` animates the pictures in daily teasers by default.                 |
| `TEASER_RENDER_SECRET`                                                | A long random string, shared with GitHub (below).                         |
| `TEASER_GITHUB_TOKEN`                                                 | Fine-grained GitHub token for this repo with **Actions: read and write**. |
| `TEASER_GITHUB_REPO`                                                  | `KenCorbettJr/ai-wizard-duel-convex`                                      |
| `TEASER_GITHUB_REF`                                                   | Branch to run the workflow from. Defaults to `main`.                      |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` | Posting to YouTube (below).                                               |
| `YOUTUBE_PRIVACY`                                                     | `public` (default), `unlisted` or `private`.                              |
| `TEASER_VIDEO_MODEL`                                                  | Override the AI motion model (default `gemini-omni-1.2-flash`).           |
| `TEASER_MUSIC_MODEL`                                                  | Override the music model (default `lyria-3.5`).                           |

### GitHub

Add a repository secret `TEASER_RENDER_SECRET` with the same value as the Convex
variable. The workflow must be on the default branch before Convex can start it.
Rendering takes a few minutes of Actions time per teaser.

### YouTube

1. In Google Cloud, enable **YouTube Data API v3** and create an OAuth client
   (type "Web application", with `https://developers.google.com/oauthplayground`
   as a redirect URI).
2. In the [OAuth Playground](https://developers.google.com/oauthplayground),
   choose "Use your own OAuth credentials", authorize the
   `https://www.googleapis.com/auth/youtube.upload` scope signed in as the
   channel, and exchange the code for a refresh token.
3. Set the three `YOUTUBE_*` variables in Convex.
4. Until Google audits the project, YouTube locks API uploads to private.
   Request the audit (the "YouTube API Services audit and quota extension"
   form) early: it takes a few weeks. In the meantime, uploads land as private
   videos you can make public in YouTube Studio.
5. While the OAuth app is in "Testing" mode, refresh tokens expire after 7
   days. Publish the OAuth consent screen to keep the token working.

## Working on the video

```sh
cd video
npm install
npm run studio        # preview with sample content
CONVEX_SITE_URL=https://<deployment>.convex.site TEASER_RENDER_SECRET=... \
  npm run render -- <teaserId>              # render a real teaser and upload it
  npm run render -- <teaserId> --no-upload  # just write out/<teaserId>.mp4
```

### Sound

- The narrator plays at `VOICE_RATE` (1.12x, pitch kept) in `src/types.ts`.
- The music drops under the voice and comes up in the gaps. The levels are
  `MUSIC_UNDER_VOICE` and `MUSIC_IN_GAPS` in `src/DuelTeaser.tsx`.
- The whoosh, boom and shimmer in `public/sfx` are synthesized by
  `python3 scripts/make-sfx.py`, so there's nothing to license.
- `public/music/fallback.mp3` was made with Lyria for this project.
