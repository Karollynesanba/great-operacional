type TaskTransferUser = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

function getDisplayName(user?: TaskTransferUser | null) {
  const rawName = user?.full_name || user?.name || user?.email || '';
  return rawName.trim();
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || name.trim();
}

function formatNameList(names: string[]) {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

function getAssigneeIdsFromTags(tags: unknown) {
  const fromTags = (tags as { assignee_user_ids?: unknown } | null | undefined)?.assignee_user_ids;
  if (Array.isArray(fromTags)) {
    return fromTags.filter(Boolean).map(String);
  }
  return [];
}

export function getTaskTransferText(params: {
  reporterUserId?: string | null;
  reporterName?: string | null;
  assigneeUserIds?: string[] | null;
  users: TaskTransferUser[];
}) {
  const assigneeIds = Array.from(new Set((params.assigneeUserIds || []).filter(Boolean)));
  const reporterName = (params.reporterName || getDisplayName(params.users.find((user) => user.id === params.reporterUserId))).trim();
  if (!reporterName || assigneeIds.length === 0) return null;

  const reporterFirstName = getFirstName(reporterName);

  const assigneeNames = assigneeIds
    .map((assigneeId) => getDisplayName(params.users.find((user) => user.id === assigneeId)))
    .filter(Boolean)
    .filter((name) => getFirstName(name) !== reporterFirstName);

  if (assigneeNames.length === 0) return null;

  const assigneeFirstNames = assigneeNames.map(getFirstName);

  if (assigneeFirstNames.length === 1 && assigneeFirstNames[0] === reporterFirstName) {
    return null;
  }

  return `${reporterFirstName} -> ${formatNameList(assigneeFirstNames)}`;
}

export function getAssigneeIdsFromTaskTags(tags: unknown, fallbackAssigneeId?: string | null) {
  const fromTags = getAssigneeIdsFromTags(tags);
  if (fromTags.length > 0) return fromTags;
  return fallbackAssigneeId ? [fallbackAssigneeId] : [];
}
