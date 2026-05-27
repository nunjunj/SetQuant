import { getTag } from '@/lib/tags';

export default function TagBadge({ tagId }: { tagId: string }) {
  const tag = getTag(tagId);
  if (!tag) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${tag.color} opacity-90 flex-shrink-0`}>
      <span>{tag.emoji}</span>
      <span>{tag.label}</span>
    </span>
  );
}
