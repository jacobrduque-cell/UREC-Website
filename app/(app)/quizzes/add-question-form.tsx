"use client";

import { useState } from "react";
import { MarkdownField } from "../ui/markdown-field";
import { SubmitButton } from "../ui/form-controls";

const OPTION_COUNT = 5;
const input =
  "w-full rounded-md border border-hair bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue";
const smallLabel = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";

export function AddQuestionForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [type, setType] = useState("multiple_choice");
  const options = Array.from({ length: OPTION_COUNT });

  return (
    <div className="mt-8 border-t border-hair pt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Add Question</h2>
      <form action={action} className="mt-3 flex flex-col gap-4">
        <div>
          <label className={smallLabel}>Question</label>
          <MarkdownField
            name="question_text"
            required
            rows={3}
            placeholder="Question text — Markdown supported. Use Insert image to add a chart, rent roll, or diagram."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={smallLabel}>Type</label>
            <select
              name="question_type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={input}
            >
              <option value="multiple_choice">Multiple choice (one answer)</option>
              <option value="multiple_answer">Multiple answer (select all)</option>
              <option value="true_false">True / False</option>
              <option value="numeric">Numeric</option>
              <option value="short_answer">Short answer</option>
              <option value="essay">Essay</option>
            </select>
          </div>
          <div>
            <label className={smallLabel}>Points</label>
            <input name="points" type="number" min={0} step="0.5" defaultValue={1} className={input} />
          </div>
        </div>

        {type === "multiple_choice" && (
          <div className="rounded-md border border-hair bg-[#fafbfb] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Options — select the one correct answer
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {options.map((_, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input type="radio" name="mc_correct" value={i} defaultChecked={i === 0} className="h-4 w-4" />
                  <input name={`option_${i}`} placeholder={`Option ${i + 1}`} className={`flex-1 ${input}`} />
                </label>
              ))}
            </div>
          </div>
        )}

        {type === "multiple_answer" && (
          <div className="rounded-md border border-hair bg-[#fafbfb] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Options — check every correct answer (full credit only if all correct ones are selected)
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {options.map((_, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input type="checkbox" name={`ma_correct_${i}`} className="h-4 w-4" />
                  <input name={`option_${i}`} placeholder={`Option ${i + 1}`} className={`flex-1 ${input}`} />
                </label>
              ))}
            </div>
          </div>
        )}

        {type === "true_false" && (
          <div className="rounded-md border border-hair bg-[#fafbfb] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Correct answer</p>
            <div className="mt-1 flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" name="tf_correct" value="true" defaultChecked className="h-4 w-4" /> True
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="tf_correct" value="false" className="h-4 w-4" /> False
              </label>
            </div>
          </div>
        )}

        {type === "numeric" && (
          <div className="grid grid-cols-2 gap-4 rounded-md border border-hair bg-[#fafbfb] p-3">
            <div>
              <label className={smallLabel}>Correct value</label>
              <input name="numeric_answer" type="number" step="any" placeholder="5.5" className={input} />
            </div>
            <div>
              <label className={smallLabel}>Tolerance (±)</label>
              <input name="numeric_tolerance" type="number" step="any" min={0} defaultValue={0} placeholder="0.1" className={input} />
            </div>
            <p className="col-span-2 text-[10px] text-muted">
              Marked correct if the answer is within ± tolerance of the value (e.g. 5.5 ±0.1 accepts 5.4–5.6).
            </p>
          </div>
        )}

        {(type === "short_answer" || type === "essay") && (
          <p className="text-xs text-muted">
            Written responses aren&rsquo;t auto-graded — you award points from the quiz&rsquo;s
            Submissions page.
          </p>
        )}

        <div>
          <label className={smallLabel}>Explanation (optional)</label>
          <textarea
            name="explanation"
            rows={2}
            placeholder="Why the answer is what it is. Shown to members after they submit, if 'show answers after submitting' is on."
            className={input}
          />
        </div>

        <SubmitButton
          pendingText="Adding…"
          className="self-start rounded-md bg-blue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Add Question
        </SubmitButton>
      </form>
    </div>
  );
}
