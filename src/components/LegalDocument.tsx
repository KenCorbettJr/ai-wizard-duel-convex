import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * The legal documents live as Markdown in docs/legal so they can be edited
 * and reviewed as plain text. They're read at build time.
 */
export function readLegalDoc(file: "terms-of-use.md" | "privacy-policy.md") {
  return fs.readFileSync(
    path.join(process.cwd(), "docs", "legal", file),
    "utf8",
  );
}

/** True while the document still carries its "DRAFT" notice. */
export function isDraft(markdown: string) {
  return /\*\*DRAFT\b/.test(markdown);
}

/**
 * Placeholders like [DATE] or [DECISION: ...] are turned into inline code so
 * they can be rendered highlighted. Link text, `[text](url)`, is left alone.
 */
function markPlaceholders(markdown: string) {
  return markdown.replace(/\[([^\]\n]+)\](?!\()/g, "`[$1]`");
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-6 font-display text-3xl font-bold tracking-wide sm:text-4xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-10 mb-3 scroll-mt-24 font-display text-xl font-bold sm:text-2xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 text-lg font-semibold">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-3 leading-relaxed text-foreground/90">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-6 text-foreground/90">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-6 text-foreground/90">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  a: ({ href = "", children }) =>
    href.startsWith("/") ? (
      <Link href={href} className="text-primary underline underline-offset-4">
        {children}
      </Link>
    ) : (
      <a
        href={href}
        className="text-primary underline underline-offset-4"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  blockquote: ({ children }) => (
    <div
      role="note"
      className="my-6 rounded-lg border border-warning/50 bg-warning/10 px-4 py-1 text-sm"
    >
      {children}
    </div>
  ),
  hr: () => <hr className="my-8 border-border" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-secondary/40 text-foreground">{children}</thead>
  ),
  th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => (
    <td className="border-t border-border px-3 py-2 align-top text-foreground/90">
      {children}
    </td>
  ),
  // Only placeholders are written as inline code (see markPlaceholders).
  code: ({ children }) => (
    <mark className="rounded bg-warning/25 px-1 font-medium text-foreground">
      {children}
    </mark>
  ),
};

export function LegalDocument({ markdown }: { markdown: string }) {
  return (
    <article className="container mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6 sm:py-12">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markPlaceholders(markdown)}
      </Markdown>
    </article>
  );
}
