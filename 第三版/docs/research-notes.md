# Pinyin Pal MVP Research Notes

## Research questions

- What pinyin error types appear most often for learners from different first-language backgrounds?
- Which contrasts cause repeated errors: tone, initial consonant, final/vowel, or missing syllable?
- Does immediate targeted feedback reduce repeat errors within a session?

## MVP scope

This version intentionally uses typed pinyin attempts plus optional local recording playback. It does not attempt automatic speech recognition yet. That keeps the first user tests focused on the research workflow: target prompt, learner attempt, facilitator/user entry, feedback, and structured logging.

## Logged fields

Each attempt is appended to `data/error_logs.json` with:

- `session_id` / `user_id`: anonymous browser session identifier
- `learner_language`: optional first-language background
- `module_id` and `target_id`
- `target_hanzi`, `target_pinyin`, and normalized target
- `user_input` and normalized input
- `is_correct`
- `error_type`: `correct`, `tone`, `consonant`, `vowel`, or `missing syllable`
- `feedback`
- server-generated `id` and `created_at`

## Next useful iteration

- Add CSV export for analysis.
- Add facilitator notes per attempt.
- Add a simple dashboard grouping error counts by first language and module.
- Replace typed attempts with browser speech recognition only after the test protocol is stable.
