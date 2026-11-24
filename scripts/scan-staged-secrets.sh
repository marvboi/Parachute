#!/usr/bin/env bash
set -euo pipefail
diff=$(git diff --cached -U0 -- . ':(exclude)scripts/scan-staged-secrets.sh' || true)

if echo "$diff" | grep -qiE '^\+.*PRIVATE_KEY\s*=\s*[^$\s"'\''{]'; then
  echo "Secret scan failed: PRIVATE_KEY assignment with literal value"
  exit 1
fi

if echo "$diff" | grep -qiE '^\+.*(MNEMONIC\s*=|SECRET\s*=|API_KEY\s*=)\s*[^$\s"'\''{]'; then
  echo "Secret scan failed: credential assignment in staged diff"
  exit 1
fi

if echo "$diff" | grep -qiE '^\+.*\b([0-9a-f]{64})\b' | grep -qiE 'private|mnemonic|secret|wallet'; then
  echo "Secret scan failed: private key shaped hex near sensitive context"
  exit 1
fi

echo "Secret scan passed"