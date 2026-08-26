export const STATUSES = ["Not Started", "In Progress", "Hold", "Completed"];
export const PRIORITIES = ["High", "Medium", "Low"];

export const STATUS_TONE = {
  "Not Started": "slate",
  "In Progress": "blue",
  Hold: "amber",
  Completed: "green",
};

export const PRIORITY_TONE = { High: "red", Medium: "amber", Low: "slate" };

// Client-facing wording. Clients shouldn't see internal status vocabulary
// like "Hold" without an explanation of what it means for them.
export const CLIENT_STATUS_LABEL = {
  "Not Started": "Queued",
  "In Progress": "In progress",
  Hold: "On hold",
  Completed: "Delivered",
};

export const REQUEST_TONE = { pending: "amber", approved: "green", declined: "slate" };
