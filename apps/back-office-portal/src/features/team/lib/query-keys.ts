export const teamKeys = {
  all: ["team"] as const,
  roster: () => [...teamKeys.all, "roster"] as const,
};
