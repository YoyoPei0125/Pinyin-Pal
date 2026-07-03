# Pinyin Pal

A clean, minimal MVP for testing Mandarin pinyin pronunciation practice and collecting structured pronunciation-error logs.

## Run locally

Recommended on this Windows machine:

```powershell
cd 第三版
powershell -ExecutionPolicy Bypass -File backend/server.ps1
```

Then open http://127.0.0.1:8000 in a browser.

If you have a working Python install, this also works:

```powershell
cd 第三版
python backend/server.py
```

## Project structure

```text
第三版/
  frontend/   Browser UI for practice and feedback
  backend/    Small local servers and JSON logging API
                server.ps1 works on Windows PowerShell
                server.py works with Python 3
  data/       Pronunciation attempt logs
  utils/      Shared pinyin parsing and error-classification helpers
  docs/       Research notes and experiment planning
```

## MVP workflow

1. Choose a module.
2. Listen to the Mandarin target.
3. Type the learner's pinyin attempt, such as `ma3`.
4. Submit to classify the attempt as correct, tone, consonant, vowel, or missing syllable.
5. Review saved attempts in the session table.

Attempts are appended to `第三版/data/error_logs.json`.

## Original prototype

The earlier single-file prototypes are still in the repository for reference, including `第二版.html`. The MVP implementation lives in `第三版/` so it can be tested and extended safely.

