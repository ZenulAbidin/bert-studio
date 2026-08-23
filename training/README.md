# TalkSearch AI-report classifier

This workflow trains a **reported-AI-content** classifier.  A positive label
means that a separate Bitcointalk report explicitly cited the post and included
multiple AI-detector results; it is not a determination of authorship.

`build_talksearch_dataset.py` writes one auditable JSONL row per target post:
the target `post_id`, the evidence post IDs, source text, and label. It uses
only high-evidence reports containing both GPTZero and ZeroGPT output, then
adds a 3:1 random negative sample that excludes AI-related language.

Use `microsoft/deberta-v3-base` for this first English-only model. Its 512
token context is adequate for a forum-post classifier; restrict the dataset to
English until an independently labeled multilingual set exists.

Run only on New Enzu, with the credentials supplied in its protected
`elastic-admin.env` file:

```bash
python training/build_talksearch_dataset.py --env /etc/talksearch-mirror/elastic-admin.env \
  --out training/data/talksearch_ai_reported_v1.jsonl
python training/finetune_talksearch_ai.py \
  --data training/data/talksearch_ai_reported_v1.jsonl \
  --output /opt/bert-studio/models/talksearch-ai-reported-v1
```

Do not enable filtering or account-level action based solely on this model.
Promote it only if the held-out report records and a manual false-positive
review meet the chosen precision threshold.
