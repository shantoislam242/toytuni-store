"use client";

import { useRef, type ReactNode } from "react";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Image } from "@tiptap/extension-image";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter, Baseline,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link2, Image as ImageIcon,
  Upload, Minus, Plus,
} from "lucide-react";
import { BLOG_PROSE } from "@/lib/blog/prose-classes";
import { cn } from "@/lib/utils";

/** Fixed highlight colour for the marker toggle (soft amber). */
const HIGHLIGHT = "#fde68a";
const SIZE_MIN = 10;
const SIZE_MAX = 72;
const SIZE_STEP = 2;

function Btn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-cream-100 hover:text-ink disabled:opacity-40",
        active && "bg-neem/15 text-neem-deep",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-6 w-px flex-none bg-cream-300" aria-hidden />;
}

function Toolbar({ editor, onImageUpload }: { editor: Editor; onImageUpload?: (file: File) => Promise<string | null> }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      highlight: e.isActive("highlight"),
      alignLeft: e.isActive({ textAlign: "left" }),
      alignCenter: e.isActive({ textAlign: "center" }),
      alignRight: e.isActive({ textAlign: "right" }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      link: e.isActive("link"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "#2b2118",
      fontSize: (e.getAttributes("textStyle").fontSize as string | undefined) ?? null,
    }),
  });

  const currentSize = s.fontSize ? parseInt(s.fontSize, 10) || 16 : 16;
  const applySize = (n: number) =>
    editor.chain().focus().setFontSize(`${Math.min(SIZE_MAX, Math.max(SIZE_MIN, n))}px`).run();

  const blockValue = s.h2 ? "h2" : s.h3 ? "h3" : "p";
  const setBlock = (v: string) => {
    const c = editor.chain().focus();
    if (v === "h2") c.setHeading({ level: 2 }).run();
    else if (v === "h3") c.setHeading({ level: 3 }).run();
    else c.setParagraph().run();
  };

  const promptLink = () => {
    const prev = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("Link URL (leave blank to remove):", prev);
    if (url === null) return;
    if (url.trim() === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  const promptImage = () => {
    const url = window.prompt("Image URL:");
    if (url && url.trim()) editor.chain().focus().setImage({ src: url.trim() }).run();
  };
  const uploadImage = async (file: File) => {
    if (!onImageUpload) return;
    const url = await onImageUpload(file);
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-input bg-cream-50/60 px-2 py-1.5">
      {/* Format */}
      <select
        value={blockValue}
        onChange={(e) => setBlock(e.target.value)}
        title="Text style"
        aria-label="Text style"
        className="mr-1 h-8 rounded-md border border-cream-300 bg-paper px-1.5 text-xs font-medium text-ink outline-none"
      >
        <option value="p">Paragraph</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      <Divider />

      {/* Font size stepper */}
      <div className="flex items-center gap-0.5" title="Font size">
        <Btn onClick={() => applySize(currentSize - SIZE_STEP)} title="Smaller"><Minus className="size-4" /></Btn>
        <span className="w-7 text-center text-xs font-semibold text-ink">{currentSize}</span>
        <Btn onClick={() => applySize(currentSize + SIZE_STEP)} title="Larger"><Plus className="size-4" /></Btn>
      </div>

      <Divider />

      {/* Text color */}
      <label
        title="Text color"
        className="relative flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-cream-100 hover:text-ink"
      >
        <Baseline className="size-4" style={{ color: s.color }} />
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(s.color) ? s.color : "#2b2118"}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Text color"
        />
      </label>
      {/* Highlight (toggle) */}
      <Btn
        onClick={() => editor.chain().focus().toggleHighlight({ color: HIGHLIGHT }).run()}
        active={s.highlight}
        title="Highlight"
      >
        <Highlighter className="size-4" />
      </Btn>

      <Divider />

      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={s.bold} title="Bold"><Bold className="size-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={s.italic} title="Italic"><Italic className="size-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={s.underline} title="Underline"><UnderlineIcon className="size-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={s.strike} title="Strikethrough"><Strikethrough className="size-4" /></Btn>

      <Divider />

      <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={s.alignLeft} title="Align left"><AlignLeft className="size-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={s.alignCenter} title="Align center"><AlignCenter className="size-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={s.alignRight} title="Align right"><AlignRight className="size-4" /></Btn>

      <Divider />

      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={s.ordered} title="Numbered list"><ListOrdered className="size-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={s.bullet} title="Bullet list"><List className="size-4" /></Btn>

      <Divider />

      <Btn onClick={promptLink} active={s.link} title="Link"><Link2 className="size-4" /></Btn>
      <Btn onClick={promptImage} title="Image by URL"><ImageIcon className="size-4" /></Btn>
      {onImageUpload && (
        <>
          <Btn onClick={() => fileRef.current?.click()} title="Upload image"><Upload className="size-4" /></Btn>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadImage(f);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}

/**
 * WYSIWYG rich-text editor (Tiptap) for the blog body. `value`/`onChange` carry
 * HTML. `onImageUpload(file) → url` (optional) powers the toolbar's upload
 * button (the blog form passes `uploadBlogCover`). SSR-safe
 * (`immediatelyRender: false`).
 */
export function RichTextEditor({
  value, onChange, onImageUpload,
}: {
  value: string;
  onChange: (html: string) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(BLOG_PROSE, "min-h-[24rem] w-full rounded-b-lg border border-input bg-paper px-4 py-3 outline-none focus:ring-2 focus:ring-neem/40"),
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  if (!editor) {
    return <div className="min-h-[27rem] rounded-lg border border-input bg-cream-50/40" aria-hidden />;
  }

  return (
    <div>
      <Toolbar editor={editor} onImageUpload={onImageUpload} />
      <EditorContent editor={editor} />
    </div>
  );
}
