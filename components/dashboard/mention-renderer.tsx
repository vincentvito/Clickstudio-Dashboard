import { Badge } from "@/components/ui/badge"
import { parseMentions } from "@/lib/mentions"

interface MentionRendererProps {
  content: string
}

export function MentionRenderer({ content }: MentionRendererProps) {
  const parts = parseMentions(content)

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "mention") {
          return (
            <Badge
              key={i}
              variant="secondary"
              className="bg-primary/10 text-primary hover:bg-primary/15 mx-0.5"
            >
              @{part.name}
            </Badge>
          )
        }
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part.content}
          </span>
        )
      })}
    </>
  )
}
