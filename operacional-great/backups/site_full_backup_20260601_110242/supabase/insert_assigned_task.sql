BEGIN;

WITH params AS (
  SELECT
    'Nova tarefa'::text AS title,
    NULL::text AS description,
    'MEDIA'::text AS priority,
    'TASK'::text AS task_type,
    'amanda.operacional@great.local'::text AS reporter_email,
    'isaquegreatsd@gmail.com'::text AS assignee_email,
    CURRENT_DATE AS due_date,
    NULL::uuid AS related_client_id,
    NULL::uuid AS workspace_id,
    NULL::uuid AS team_id
),
reporter AS (
  SELECT id
  FROM public.profiles, params
  WHERE lower(public.profiles.email) = lower(params.reporter_email)
  LIMIT 1
),
assignee AS (
  SELECT id
  FROM public.profiles, params
  WHERE lower(public.profiles.email) = lower(params.assignee_email)
  LIMIT 1
)
INSERT INTO public.work_items (
  title,
  description,
  priority,
  status,
  assignee_user_id,
  reporter_user_id,
  type,
  due_date,
  tags,
  related_client_id,
  team_id,
  workspace_id
)
SELECT
  params.title,
  params.description,
  params.priority,
  'TODO',
  assignee.id,
  reporter.id,
  params.task_type,
  params.due_date,
  jsonb_build_object('assignee_user_ids', jsonb_build_array(assignee.id)),
  params.related_client_id,
  params.team_id,
  params.workspace_id
FROM params, reporter, assignee
RETURNING id;

COMMIT;
