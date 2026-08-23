# TalkSearch AI review workflow

BERT Studio supplies a model score for **review prioritisation**. It does not
establish who authored a post and must not automatically remove, hide, or make
an allegation about a post or account.

## Default baseline

The deployment uses `openai-community/roberta-base-openai-detector` as a
starting point. It is a detector for its own training distribution, so treat
its output as a triage score only. The configured positive label is `Fake`.

Replace this baseline with a TalkSearch-specific fine-tuned model once there
is a reviewed data set. Set these host-only values in `backend/.env.local`:

```dotenv
AI_DETECTOR_MODEL=organization/talksearch-ai-review-v1
AI_DETECTOR_POSITIVE_LABEL=machine_generated
```

## API contract

`POST /api/talksearch/score` accepts up to 128 posts, each no longer than
12,000 characters:

```json
{
  "posts": [
    {"post_id": 123, "content": "Forum post text"}
  ]
}
```

Each result contains `machine_score` from 0 to 1, the model label, the exact
model id, and `review_only: true`. Persist the model id and score with the
review record so a later model change does not overwrite historical evidence.

The batch worker supplies `X-Internal-Scorer-Token`; set the same random value
as `INTERNAL_SCORER_TOKEN` in the BERT Studio host configuration. This token is
only for loopback worker-to-service requests and must never be sent to browsers.

## Calibration gate

Before scoring the corpus, sample and manually label at least 500 posts across
languages, boards, dates, and post lengths. Hold out 20% before training.
Choose a threshold that meets the moderator-approved precision target, and
route only those posts to a review queue. Measure false-positive rate by
language and board; do not use a single English-trained detector to moderate
non-English content.
