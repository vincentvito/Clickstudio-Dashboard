"use client"

import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Mention from "@tiptap/extension-mention"
import Placeholder from "@tiptap/extension-placeholder"
import tippy, { type Instance as TippyInstance } from "tippy.js"
import "tippy.js/dist/tippy.css"
import { useEffect, useMemo, useRef } from "react"
import { useOrgMembers } from "@/lib/store"
import { MentionList, type MentionItem } from "./mention-list"
import { mentionTextToHtml } from "@/lib/mentions"

interface TiptapEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

/**
 * Serialize Tiptap JSON document back to our `@[Name](userId)` storage format.
 */
function serializeDoc(doc: any): string {
  if (!doc?.content) return ""

  const lines: string[] = []

  for (const node of doc.content) {
    if (node.type === "paragraph") {
      let line = ""
      if (node.content) {
        for (const child of node.content) {
          if (child.type === "text") {
            line += child.text
          } else if (child.type === "mention") {
            const label = child.attrs?.label ?? ""
            const id = child.attrs?.id ?? ""
            line += `@[${label}](${id})`
          }
        }
      }
      lines.push(line)
    }
  }

  return lines.join("\n")
}

export function TiptapEditor({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: TiptapEditorProps) {
  const { members } = useOrgMembers()
  const membersRef = useRef<MentionItem[]>([])
  membersRef.current = members

  // Convert storage format to initial HTML once on mount.
  // Parent uses key={noteId} to force remount when switching notes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialHtml = useMemo(() => mentionTextToHtml(value), [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
      Mention.configure({
        HTMLAttributes: {
          class:
            "inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary mx-0.5",
        },
        renderText({ node }) {
          return `@${node.attrs.label}`
        },
        suggestion: {
          items: ({ query }) => {
            const q = query.toLowerCase()
            return membersRef.current
              .filter(
                (m) =>
                  (m.name?.toLowerCase() ?? "").includes(q) || m.email.toLowerCase().includes(q),
              )
              .slice(0, 5)
          },
          render: () => {
            let component: ReactRenderer | null = null
            let popup: TippyInstance | null = null

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                })
                if (!props.clientRect) return
                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                  theme: "light-border",
                })[0]
              },
              onUpdate(props: any) {
                component?.updateProps(props)
                if (!props.clientRect) return
                popup?.setProps({ getReferenceClientRect: props.clientRect })
              },
              onKeyDown(props: any) {
                if (props.event.key === "Escape") {
                  popup?.hide()
                  return true
                }
                const instance = component?.ref as
                  | { onKeyDown: (props: { event: KeyboardEvent }) => boolean }
                  | undefined
                return instance?.onKeyDown(props) ?? false
              },
              onExit() {
                popup?.destroy()
                component?.destroy()
              },
            }
          },
        },
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none ${className ?? ""}`,
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate({ editor }) {
      const json = editor.getJSON()
      onChange(serializeDoc(json))
    },
  })

  useEffect(() => {
    if (autoFocus && editor) {
      editor.commands.focus("end")
    }
  }, [autoFocus, editor])

  return <EditorContent editor={editor} />
}
