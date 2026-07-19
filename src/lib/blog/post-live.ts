export type PostStatus = "draft" | "scheduled" | "published";

type Input = { published: boolean; scheduledAt: string | null; now: Date };

/** A post is live when it's published, or its schedule time has passed. Pure. */
export function isPostLive({ published, scheduledAt, now }: Input): boolean {
  if (published) return true;
  if (scheduledAt) return new Date(scheduledAt).getTime() <= now.getTime();
  return false;
}

/** Admin status badge. Pure. */
export function postStatus(input: Input): PostStatus {
  if (isPostLive(input)) return "published";
  return input.scheduledAt ? "scheduled" : "draft";
}
