#!/usr/bin/env python3
"""Fine-tune an English reported-AI-content classifier on audited JSONL data."""
import argparse
import json
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from datasets import Dataset, DatasetDict
from sklearn.metrics import precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from transformers import (AutoModelForSequenceClassification, AutoTokenizer,
                          DataCollatorWithPadding, Trainer, TrainingArguments)


def metrics(prediction):
    labels = prediction.label_ids
    predicted = np.argmax(prediction.predictions, axis=1)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, predicted, average="binary", zero_division=0)
    return {"precision": precision, "recall": recall, "f1": f1}


class WeightedTrainer(Trainer):
    """Avoid the majority-class collapse that a small, imbalanced review set causes."""
    def __init__(self, *args, class_weights, **kwargs):
        super().__init__(*args, **kwargs)
        self.class_weights = class_weights

    def compute_loss(self, model, inputs, return_outputs=False, num_items_in_batch=None):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        loss = F.cross_entropy(outputs.logits, labels,
                               weight=self.class_weights.to(outputs.logits.device))
        return (loss, outputs) if return_outputs else loss


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="microsoft/deberta-v3-base")
    parser.add_argument("--epochs", type=float, default=3)
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--learning-rate", type=float, default=5e-6)
    args = parser.parse_args()
    rows = [json.loads(line) for line in Path(args.data).read_text().splitlines() if line.strip()]
    dataset = Dataset.from_list([{key: row[key] for key in ("text", "label")} for row in rows])
    if len(set(dataset["label"])) != 2 or sum(dataset["label"]) < 30:
        raise SystemExit("Need at least 30 evidence-backed positives and both classes before training")
    indices = list(range(len(dataset)))
    train_indices, test_indices = train_test_split(
        indices, test_size=0.2, stratify=dataset["label"], random_state=20260823
    )
    split = DatasetDict({"train": dataset.select(train_indices), "test": dataset.select(test_indices)})
    train_labels = np.asarray(split["train"]["label"])
    counts = np.bincount(train_labels, minlength=2)
    class_weights = torch.tensor(len(train_labels) / (2 * counts), dtype=torch.float)
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    def tokenize(batch): return tokenizer(batch["text"], truncation=True, max_length=args.max_length)
    tokenized = split.map(tokenize, batched=True)
    model = AutoModelForSequenceClassification.from_pretrained(args.model, num_labels=2,
        id2label={0: "not_reported_ai", 1: "reported_ai"}, label2id={"not_reported_ai": 0, "reported_ai": 1})
    training = TrainingArguments(output_dir=args.output, learning_rate=args.learning_rate, num_train_epochs=args.epochs,
        per_device_train_batch_size=4, per_device_eval_batch_size=8, gradient_accumulation_steps=2,
        eval_strategy="epoch", save_strategy="epoch", load_best_model_at_end=True, metric_for_best_model="f1",
        greater_is_better=True,
        # Transformers 5 + torch 2.13 mis-handle GradScaler with FP16 on CUDA.
        # Ampere-and-newer GPUs use BF16; other devices remain in full precision.
        fp16=False, bf16=torch.cuda.is_available() and torch.cuda.is_bf16_supported(),
        report_to="none", seed=20260823)
    trainer = WeightedTrainer(model=model, args=training, train_dataset=tokenized["train"], eval_dataset=tokenized["test"],
        processing_class=tokenizer, data_collator=DataCollatorWithPadding(tokenizer), compute_metrics=metrics,
        class_weights=class_weights)
    trainer.train()
    results = trainer.evaluate()
    Path(args.output).mkdir(parents=True, exist_ok=True)
    trainer.save_model(args.output)
    tokenizer.save_pretrained(args.output)
    Path(args.output, "evaluation.json").write_text(__import__("json").dumps(results, indent=2) + "\n")
    print(results)


if __name__ == "__main__":
    main()
