# Migration Notes: Jobs Schema Update

## Summary of changes

- **`jobs`** model extended with new fields; **`job_questions`** kept for video questions; new **`WorkMode`** enum.
- **Primary keys** unchanged (`job_id`, `question_id`).
- **Existing relations** preserved: `recruiters`, `candidate_applications`, `job_questions` (exposed as `video_questions` on `jobs`).

---

## 1. New enum

- **`WorkMode`**: `ONSITE` | `REMOTE` — used by `jobs.work_mode`.

---

## 2. `jobs` model – new fields

| Field                     | Type      | Notes |
|---------------------------|-----------|--------|
| `skills`                  | `String[]`| Multiple values; PostgreSQL array. |
| `minimum_experience_years`| `Int`     | Must be ≥ 0 (validate in app). |
| `other_requirements`     | `String?` | Long text. |
| `location`               | `String`  | Required. |
| `work_mode`              | `WorkMode`| ONSITE or REMOTE. |
| `salary_monthly_pkr`     | `Int`     | Must be > 0 (validate in app). |
| `cv_score_weightage`     | `Int`     | Percentage part; must satisfy cv + video = 100 (e.g. 75% + 25% = 100%). Enforced by DB CHECK and API. |
| `video_score_weightage`  | `Int`     | Same as above. |
| `updated_at`             | `DateTime`| `@updatedAt` – set by Prisma. |

---

## 3. CV + Video weightage = 100 (DB and API)

- **Meaning:** CV and video weightage are the two percentage parts of the total score (e.g. 75% CV + 25% Video = 100%). They are not two separate “out of 100” scores.
- **DB constraint:** Run the script below so the DBMS enforces the rule:
  ```bash
  # From project root, using psql or Neon SQL editor with your DATABASE_URL:
  # Run the contents of prisma/scripts/add_weightage_sum_100_constraint.sql
  ```
  That script (1) corrects any existing rows where the sum ≠ 100, then (2) adds `CHECK (cv_score_weightage + video_score_weightage = 100)`.
- **API:** The FastAPI backend validates this on seed and should validate on any create/update job endpoint (e.g. `validate_weightage_sum_100(cv_w, vid_w)`).

---

## 4. Other validation (application layer)

- **Salary:** `salary_monthly_pkr > 0`.
- **Experience:** `minimum_experience_years >= 0`.

---

## 5. Skills: array vs relation

- **Current choice: `String[]`**  
  - One column, simple to use from the job form.  
  - Good for free-text skills and moderate scale.  
  - No extra table or joins.

- **Alternative: normalized table**  
  - e.g. `skills (skill_id, name)` + `job_skills (job_id, skill_id)`.  
  - Use if you need: fixed skill taxonomy, reporting by skill, or reuse across jobs.  
  - Requires schema change and migration if you switch later.

---

## 6. Relation rename

- **`jobs.job_questions`** → **`jobs.video_questions`** (field name only).
- Same table `job_questions`, same `job_id` FK and cascade delete; only the relation name on `jobs` changed for clarity.

---

## 7. Commands after pulling schema changes

From project root:

```bash
npx prisma generate
npx prisma db push
```

Or, for a versioned migration:

```bash
npx prisma migrate dev --name add_jobs_fields_and_work_mode_enum
```

---

## 8. Backward compatibility

- `job_id`, `recruiter_id`, `status`, `candidate_applications`, and `recruiters` relation are unchanged.
- Existing `candidate_applications` rows and FKs remain valid.
- New fields are required (no `?`); existing rows must be updated or migrated with defaults when you first deploy (e.g. via a one-off script or default values in a migration).
