#!/usr/bin/env bash
# Simple seeding script using Supabase REST with the service role key.
# Usage:
#   SUPABASE_URL=https://<project>.supabase.co SUPABASE_SERVICE_KEY=<service_role_key> ./scripts/seed_internships.sh

set -euo pipefail

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_KEY:-}" ]; then
  echo "Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
  exit 1
fi

API="$SUPABASE_URL/rest/v1/internships"

cat > /tmp/internships_seed.json <<'JSON'
[
  {
    "company": "Acme Labs",
    "role": "Software Engineering Intern",
    "field": "Computer Science",
    "category": "Software",
    "description": "Work on backend services and APIs.",
    "requirements": "JavaScript/Node, SQL, Git",
    "interests": ["backend","api"],
    "recruiter_link": "https://acme.example/careers",
    "deadline": "2026-08-01T00:00:00Z"
  },
  {
    "company": "BrightHealth",
    "role": "Data Science Intern",
    "field": "Data Science",
    "category": "AI/ML",
    "description": "Assist with model training and data pipelines.",
    "requirements": "Python, pandas, SQL",
    "interests": ["ml","data"],
    "recruiter_link": "https://brighthealth.example/jobs",
    "deadline": "2026-07-15T00:00:00Z"
  }
]
JSON

curl -sSf -X POST "$API" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  --data-binary @/tmp/internships_seed.json | jq '.'

rm /tmp/internships_seed.json

echo "Seeding complete."
