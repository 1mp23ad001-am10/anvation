# Voiceprint Content Studio

A creator-first social-writing studio for Instagram, LinkedIn, and X.

## Run the app

1. Install Python 3.10 or later.
2. Run `python -m venv .venv`.
3. Activate the environment and run `pip install -r requirements.txt`.
4. Start the app with `python app.py` and open `http://127.0.0.1:8890`.

Flask is required for social API access, multilingual transcription, and generation.

## MVP flow

- Start with a social profile URL. Results are unchecked until you select the posts you wrote; only selected posts flow into the voice examples when you continue. Then choose creator type, channel, language, and whether to use posts, an audio recording, or a voice description.
- Select NGO, business, influencer / creator, or product / brand.
- Inspect computed writing metrics, voice notes, do/don't guidance, and six sample posts per brand.
- Generate editable, platform-adapted drafts with a requested word count, formality, energy, and campaign intent controls. The editor shows the actual Unicode-aware word count. The configured model gets up to eight expansion passes; when the model or a platform character limit cannot reach the request after expansion passes, the target is reset to the actual count and the reason is shown. X targets are capped at 35 words to fit 280 characters.
- Optionally add a goal, audience, verified facts, or writing rules when a post needs them.
- Use Rewrite, Improve clarity, Expand, Shorten, and Add CTA actions on the adapted draft, then use edits as direction for another pass.
- Optionally add a campaign keyword and its context; supplied terms are used naturally.
- Choose a discovery goal: social + SEO, AEO, GEO, or all three. These are structural writing aids, not ranking promises.
- Build and edit a coordinated Instagram, LinkedIn, and X campaign pack from one brief.
- Choose Instagram, LinkedIn, or X as the target platform.
- Build a voice profile from selected profile posts, pasted posts, a recording transcribed with local Whisper, or a no-history voice description. Kannada, Hindi, and English are auto-detected in recordings; draft language remains a separate choice.
- Import Instagram profile posts using SerpAPI’s Instagram Profile API. X timelines use the X API; LinkedIn imports use the official Posts API and the connected member account. No generic Google search is used.
- Inspect an explainable quality rubric for voice fit, platform fit, keyword/context, clarity, brand safety, and discovery readiness.
- Explicitly approve a draft for publishing; the prototype requires an official platform OAuth integration before it can actually publish.
- Generated and built-in sample copy is emoji-free.
- Continue with local starter drafts when no model is configured. Sarvam is used for multilingual generation when configured.

## API configuration

The Flask API loads a local `.env` file at startup (the file is ignored by Git). Copy `.env.example` to `.env`, add provider keys there, and never commit credentials. For local use, Flask session and token-encryption keys are generated into ignored files if left blank. For a hosted deployment, set strong `FLASK_SECRET_KEY` and a Fernet-compatible `TOKEN_ENCRYPTION_KEY` through the host's secret manager:

- `SARVAM_API_KEY`: enables Sarvam Chat Completion V1.
- `SARVAM_MODEL`: optional model identifier; defaults to `sarvam-105b`.
- `SERPAPI_API_KEY`: enables Instagram profile post import through the Instagram Profile API engine.
- `LLM_API_KEY`: API credential for an OpenAI-compatible chat-completions endpoint.
- `LLM_MODEL`: model identifier for that endpoint.
- `LLM_BASE_URL`: optional API base URL; defaults to `https://api.openai.com/v1`.

Credentials stay server-side. Sarvam Chat Completion V1 is used for English, Hindi, Kannada, Hinglish, and Kanglish generation when configured. No custom ML model training is required; Python computes text metrics and a transparent heuristic score. The score is not a prediction of reach or engagement.

## Public search and account connections

Instagram posts come from SerpAPI’s dedicated Instagram Profile API engine and must match the requested username. X posts come from the connected account’s X API timeline. LinkedIn posts come from the connected member’s official Posts API endpoint and require the restricted `r_member_social` permission plus `w_member_social` to publish. Generic Google organic results are not used. Tokens are encrypted at rest in local SQLite; development session/encryption keys are generated locally and ignored by Git.

## API

- `POST /api/analyze` accepts `brand_id`, optional `sample_posts`, and voice preferences; returns computed metrics and a profile. Empty post history is supported in preference mode.
- `POST /api/discover` accepts up to three X, LinkedIn, or Instagram profile URLs and uses the matching platform API (SerpAPI only for Instagram).
- `POST /api/transcribe` accepts an audio file and transcribes Kannada, Hindi, or English with faster-whisper on the app host. The base model downloads on first use; audio is stored temporarily and deleted after transcription. The transcript is sent with generation requests to the configured writing provider.
- `POST /api/generate` accepts creator category, voice source, topic, platform, output language, discovery optimization target, keyword and context, audience, approved facts, writing rules, and optional edit direction; returns one adapted draft and the actual word count; impossible character-limit targets are reported.
- `POST /api/score` applies a transparent weighted heuristic for voice, channel, keyword/context, clarity, safety, and discovery structure. It does not predict reach or engagement.
- `POST /api/research` is retired; generic web search has been removed.
- `GET /api/health` reports whether Sarvam, another compatible model, or local mode is active, plus safe integration availability flags.

## Current limit

The app supports Instagram, LinkedIn, and X only. Publishing requires the matching approved provider app and account connection; Instagram publishing also requires a publicly reachable media URL. LinkedIn member-post reads require the restricted `r_member_social` permission. Every publish request requires explicit approval of the exact saved draft text. This prototype is designed for localhost use; a public deployment also needs user authentication, CSRF protection, and per-user account/token isolation.

## Voiceprint profiles, campaigns, and integration readiness

The Flask app stores custom voice profiles, campaign briefs, editable drafts, and provider-reported performance snapshots in a local `voiceprint.sqlite3` file. The API serves four starter voice profiles and eight scenario templates for each audience category (NGO, business, creator, product). Keywords and their context are optional. Generation supports English, Hindi, Kannada, Hinglish, and Kanglish.

Generation takes `scenario_id`, `language`, `target_words`, `formality`, `energy`, `campaign_intent`, `keywords`, and `keyword_context`. Emoji controls and generation behavior have been removed; generated and saved draft text is sanitized. Sarvam is the configured multilingual provider when `SARVAM_API_KEY` is available.

OAuth connection routes use `/auth/<platform>/start` and `/auth/<platform>/callback`. Connections show as unavailable until each provider app is configured. Authorized authored-post import is available through `/api/platforms/<platform>/posts` for providers/scopes that allow it; this does not unlock consumer/private-account access beyond the platform API. Metric sync is available through `POST /api/performance/sync` for Voiceprint-published posts where the provider returns permitted metrics; manual provider-reported metrics can also be recorded at `/api/drafts/<id>/performance`. Available route groups include `/api/voice-profiles`, `/api/scenarios`, `/api/campaigns`, `/api/drafts`, `/api/platforms`, and `/api/performance`. Performance records are separate from the writing-quality rubric and are not click/view predictions.
