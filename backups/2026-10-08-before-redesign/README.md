# Voiceprint Content Studio

A creator-first social-writing studio for NGOs, businesses, influencers / creators, and product brands.

## Run the app

1. Install Python 3.10 or later.
2. Run `python -m venv .venv`.
3. Activate the environment and run `pip install -r requirements.txt`.
4. Start the app with `python app.py` and open `http://127.0.0.1:8765`.

The browser-only fallback can also be previewed by opening `index.html` directly, but Flask is needed for the `/api/*` endpoints.

## MVP flow

- Start with animated onboarding for creator type, channel, language, and post-history path.
- Select NGO, business, influencer / creator, or product / brand; the no-history onboarding asks category-specific setup questions.
- Inspect computed writing metrics, voice notes, do/don't guidance, and six sample posts per brand.
- Generate editable, platform-adapted drafts with word-count, formality, energy, and campaign intent controls.
- Add campaign name and goal, choose an audience, and ground the copy in approved brand facts and writing rules.
- Use Rewrite, Improve clarity, Expand, Shorten, and Add CTA actions on the adapted draft, then use edits as direction for another pass.
- Add campaign keywords with their intended meaning; the draft must use a term naturally rather than stuffing it.
- Choose a discovery goal: social + SEO, AEO, GEO, or all three. These are structural writing aids, not ranking promises.
- Build and edit a coordinated Instagram, LinkedIn, X, TikTok, Facebook, Threads, YouTube Shorts, and Pinterest campaign pack from one brief.
- Choose Instagram, LinkedIn, X, TikTok, Facebook, Threads, YouTube Shorts, or Pinterest as the target platform.
- Build a voice profile from pasted posts or from a no-history preference form (self-description, tone, favorite words, and words to avoid).
- Search public Google-indexed excerpts for profile discovery and campaign research through SerpAPI. Results are snippets, not a reliable post archive; review them and paste authored text for better style analysis.
- Inspect an explainable quality rubric for voice fit, platform fit, keyword/context, clarity, brand safety, and discovery readiness.
- Explicitly approve a draft for publishing; the prototype requires an official platform OAuth integration before it can actually publish.
- Generated and built-in sample copy is emoji-free.
- Continue with local starter drafts when no model is configured. Sarvam is used for multilingual generation when configured.

## API configuration

The Flask API loads a local `.env` file at startup (the file is ignored by Git). Copy `.env.example` to `.env`, add provider keys there, and never commit credentials. For local use, Flask session and token-encryption keys are generated into ignored files if left blank. For a hosted deployment, set strong `FLASK_SECRET_KEY` and a Fernet-compatible `TOKEN_ENCRYPTION_KEY` through the host's secret manager:

- `SARVAM_API_KEY`: enables Sarvam Chat Completion V1.
- `SARVAM_MODEL`: optional model identifier; defaults to `sarvam-105b`.
- `SERPAPI_API_KEY`: enables public profile discovery and campaign research.
- `LLM_API_KEY`: API credential for an OpenAI-compatible chat-completions endpoint.
- `LLM_MODEL`: model identifier for that endpoint.
- `LLM_BASE_URL`: optional API base URL; defaults to `https://api.openai.com/v1`.

Credentials stay server-side. Sarvam Chat Completion V1 is used for English, Hindi, Kannada, Hinglish, and Kanglish generation when configured. No custom ML model training is required; Python computes text metrics and a transparent heuristic score. The score is not a prediction of reach or engagement.

## Public search and account connections

SerpAPI searches Google-indexed public profile excerpts and campaign research. It does not log in to social accounts or retrieve private posts. Paste authored examples for reliable voice analysis. OAuth authorization-code flows are implemented for Instagram, Facebook Pages, Threads, LinkedIn, X, TikTok, YouTube, and Pinterest. Register provider apps, add their client credentials and exact callback URLs from `.env.example` to `.env`, and obtain all required platform reviews/scopes before account actions can work. Tokens are encrypted at rest in local SQLite; development session/encryption keys are generated locally and ignored by Git.

## API

- `POST /api/analyze` accepts `brand_id`, optional `sample_posts`, and voice preferences; returns computed metrics and a profile. Empty post history is supported in preference mode.
- `POST /api/discover` accepts up to eight public profile URLs; returns Google-indexed snippets when `SERPAPI_API_KEY` is configured.
- `POST /api/generate` accepts creator category, voice source, topic, platform, output language, discovery optimization target, keyword and context, audience, approved facts, writing rules, and optional edit direction; returns generic and adapted text.
- `POST /api/score` applies a transparent weighted heuristic for voice, channel, keyword/context, clarity, safety, and discovery structure. It does not predict reach or engagement.
- `POST /api/research` searches public web references through SerpAPI for a campaign query.
- `GET /api/health` reports whether Sarvam, another compatible model, or local mode is active, plus safe integration availability flags.

## Current limit

Publishing adapters exist for text posts on X, LinkedIn, Threads, and Facebook Pages, plus Instagram, TikTok, Pinterest, and YouTube when their required media/destination details and permissions are supplied. YouTube accepts an uploaded video and explicit visibility choice. TikTok requires an approved app and verified media domain; Instagram requires an eligible professional account and a reachable media URL; Pinterest requires a board ID. Every publish request requires explicit approval of the exact saved draft text. Provider scope/app review errors remain possible until each developer app is approved. This prototype is designed for localhost use; a public deployment also needs user authentication, CSRF protection, and per-user account/token isolation.


## Voiceprint profiles, campaigns, and integration readiness

The Flask app stores custom voice profiles, campaign briefs, editable drafts, and provider-reported performance snapshots in a local `voiceprint.sqlite3` file. The API serves four starter voice profiles and eight scenario templates for each audience category (NGO, business, creator, product). Campaign generation requires a keyword and its context and supports English, Hindi, Kannada, Hinglish, and Kanglish.

Generation takes `scenario_id`, `language`, `target_words`, `formality`, `energy`, `campaign_intent`, `keywords`, and `keyword_context`. Emoji controls and generation behavior have been removed; generated and saved draft text is sanitized. Sarvam is the configured multilingual provider when `SARVAM_API_KEY` is available.

OAuth connection routes use `/auth/<platform>/start` and `/auth/<platform>/callback`. Connections show as unavailable until each provider app is configured. Authorized authored-post import is available through `/api/platforms/<platform>/posts` for providers/scopes that allow it; this does not unlock consumer/private-account access beyond the platform API. Metric sync is available through `POST /api/performance/sync` for Voiceprint-published posts where the provider returns permitted metrics; manual provider-reported metrics can also be recorded at `/api/drafts/<id>/performance`. Available route groups include `/api/voice-profiles`, `/api/scenarios`, `/api/campaigns`, `/api/drafts`, `/api/platforms`, and `/api/performance`. Performance records are separate from the writing-quality rubric and are not click/view predictions.
