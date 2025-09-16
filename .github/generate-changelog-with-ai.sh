#!/usr/bin/env bash
set -euo pipefail

: "${COMMITS_LOG?Need COMMITS_LOG}" # ensure env variable provided
: "${OPENAI_API_KEY?Need OPENAI_API_KEY}" # ensure API key provided

requestToOpenAI=$(jq -n --arg commits "$COMMITS_LOG" '
  {
    model: "gpt-5-mini",
    input: [
      { "role": "system", "content": "Summarize the following commit messages into a bullet list with PR number at the end if present. Output only the changelog list, no explanation, no extra text." },
      { "role": "user",   "content": $commits }
    ]
  }
')

openAiOutput=$(echo "$requestToOpenAI" | curl -sS -X POST https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d @-
)

echo "OpenAI Output" $openAiOutput

if ! echo "$openAiOutput" | jq empty >/dev/null 2>&1 || \
   [ "$(echo "$openAiOutput" | jq -r '.error // empty')" != "" ]; then
  error=$(echo "$openAiOutput" | jq -r '.error // "Unknown error"')
  echo "::error::$error"
  exit 1
fi

messageOutput=$(echo "$openAiOutput" | jq -r '.output[] | select(.type == "message")')

echo "MessageOutput" $messageOutput

summary=$(echo "$messageOutput" | jq -r '.content[0].text')

echo "Summary" $summary

echo "summary<<EOF" >> "$GITHUB_OUTPUT"
echo "$summary" >> "$GITHUB_OUTPUT"
echo "EOF" >> "$GITHUB_OUTPUT"
