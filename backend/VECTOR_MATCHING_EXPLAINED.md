# Vector Matching — What Changed and Why

## The Problem

When a student uploads their CV, the old system compared it against **every single internship** in the database one-by-one. Each comparison required:
- 1 API call to get an embedding (text → numbers)
- 1 API call to an LLM for reasoning

So if there are 50 internships, that's **100 API calls** just for one CV upload. This was:
- Slow (30–60 seconds)
- Expensive (burns through Groq's free tier instantly)
- Hitting rate limits (429 errors)

## The New Approach

Instead of comparing against everything, we now:

1. **Store a "fingerprint" (embedding) for each internship once** when it's created
2. **Store a "fingerprint" for the student's CV once** when they upload it
3. **Compare fingerprints using math** (cosine similarity) — this is instant, no API calls needed
4. **Only do detailed analysis on the top 15 matches**
5. **Only call the AI for reasoning on the top 5**

## What's an Embedding?

An embedding is a list of 1024 numbers that represents the "meaning" of a piece of text. Two texts about similar topics will have similar numbers. We use Cohere's API to generate these.

Think of it like converting a CV into GPS coordinates — two similar CVs will have coordinates close together, and you can measure distance without reading the actual text.

## Database Changes (the SQL migration)

The migration adds three new columns:

| Table | Column | What it stores |
|-------|--------|---------------|
| `profiles` | `cv_embedding` | The 1024-number fingerprint of the student's CV |
| `internships` | `job_embedding` | The 1024-number fingerprint of the job posting |
| `internships` | `job_structured` | Parsed job requirements (skills, domain, etc.) as JSON |

It also creates indexes so searching through embeddings is fast.

## Cost Comparison

| Scenario: 50 internships | Before | After |
|---|---|---|
| Embedding API calls per CV upload | 51 | 1 |
| LLM (AI) calls per CV upload | ~50 | 5 |
| Time per CV upload | 30–60 sec | 3–5 sec |
| Rate limit risk | Very high | Very low |

## Files Involved

- **`services/vector_matching_service.py`** — The new matching engine
- **`supabase/migrations/20260716080000_add_embedding_columns.sql`** — Adds the new database columns
- **`backfill_embeddings.py`** — One-time script to generate embeddings for existing internships/CVs
- **`routers/cv.py`** — Updated to use the new system

## How to Deploy

1. Run the SQL migration in your Supabase SQL Editor
2. Run `python backfill_embeddings.py` once to generate embeddings for existing data
3. Restart the backend — all future uploads will use the new fast system automatically
