import type { ReactNode } from "react";

const KEYWORDS = new Set([
  "function",
  "external",
  "internal",
  "public",
  "private",
  "view",
  "pure",
  "returns",
  "return",
  "if",
  "else",
  "for",
  "while",
  "memory",
  "storage",
  "calldata",
  "struct",
  "contract",
  "interface",
  "enum",
  "event",
  "emit",
  "import",
  "pragma",
  "solidity",
  "mapping",
  "address",
  "uint256",
  "uint64",
  "uint16",
  "uint8",
  "int256",
  "bool",
  "bytes",
  "revert",
  "new",
  "delete",
]);

const TYPES = new Set(["LogRecord", "Feed", "Watch", "Position", "Status"]);

type Token = { kind: "kw" | "type" | "str" | "cmt" | "num" | "sym" | "id"; text: string };

function tokenize(line: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < line.length) {
    if (line.slice(i, i + 3) === "///" || (line[i] === "/" && line[i + 1] === "/")) {
      out.push({ kind: "cmt", text: line.slice(i) });
      break;
    }
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== q) j++;
      out.push({ kind: "str", text: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(line[i]!) && (i === 0 || !/[a-zA-Z_]/.test(line[i - 1]!))) {
      let j = i;
      while (j < line.length && /[0-9_]/.test(line[j]!)) j++;
      out.push({ kind: "num", text: line.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(line[i]!)) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_]/.test(line[j]!)) j++;
      const word = line.slice(i, j);
      if (KEYWORDS.has(word)) out.push({ kind: "kw", text: word });
      else if (TYPES.has(word)) out.push({ kind: "type", text: word });
      else out.push({ kind: "id", text: word });
      i = j;
      continue;
    }
    out.push({ kind: "sym", text: line[i]! });
    i += 1;
  }
  return out;
}

function span(tok: Token, key: number): ReactNode {
  const cls =
    tok.kind === "kw"
      ? "sol-kw"
      : tok.kind === "type"
        ? "sol-type"
        : tok.kind === "str"
          ? "sol-str"
          : tok.kind === "cmt"
            ? "sol-cmt"
            : tok.kind === "num"
              ? "sol-num"
              : "";
  if (cls) return <span key={key} className={cls}>{tok.text}</span>;
  return <span key={key}>{tok.text}</span>;
}

export function SolidityCodeBlock({ code, startLine = 1 }: { code: string; startLine?: number }) {
  const lines = code.split("\n");
  return (
    <pre className="solidity-block" tabIndex={0}>
      <code>
        {lines.map((line, idx) => (
          <div key={idx} className="solidity-line">
            <span className="sol-ln tabular" aria-hidden>
              {startLine + idx}
            </span>
            <span className="sol-code">{tokenize(line).map((t, ti) => span(t, ti))}</span>
          </div>
        ))}
      </code>
    </pre>
  );
}