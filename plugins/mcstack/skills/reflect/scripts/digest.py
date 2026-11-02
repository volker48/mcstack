#!/usr/bin/env python3
"""Print a numbered digest of a Claude Code session transcript.

A transcript is a JSONL file under ``~/.claude/projects/<slug>/``: the session
at ``<session-id>.jsonl`` and its subagents at
``<session-id>/subagents/agent-<id>.jsonl``, each beside an
``agent-<id>.meta.json`` that holds the description it was spawned with.

The digest keeps only ``user`` and ``assistant`` lines, and within them the
text, ``tool_use`` and ``tool_result`` blocks, one entry per output line.
Thinking blocks, attachments, and every other line type are left out, and
lines that are not JSON are skipped. For a session transcript it then lists
the session's subagent transcripts with their descriptions, leaving out the
reflect skill's own agents, so reviewers do not read each other. Digest one
subagent by passing its path.

Usage:
    python3 digest.py [--max-chars N] <transcript.jsonl>
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

DEFAULT_MAX_CHARS = 500

# Reflect names its reviewers and synthesizer "Reflect: <role>". Earlier runs
# used "Reflect <role>" with no colon, so either form marks a reflect agent.
REFLECT_AGENT = re.compile(r"^Reflect[:\s]")


def one_line(text: str) -> str:
    """Escape line breaks so an entry stays on one output line."""
    return text.replace("\r\n", "\n").replace("\n", "\\n").replace("\r", "\\r")


def short_id(block: dict[str, object], key: str) -> str:
    """The last 8 characters of a tool call's id, to pair parallel calls with results."""
    return str(block.get(key) or "?")[-8:]


def clip(text: str, limit: int | None) -> str:
    """Cut text to ``limit`` characters and note how much was cut.

    Args:
        text: The text to shorten.
        limit: The most characters to keep, or None to keep everything.

    Returns:
        The text, with a ``[+N chars]`` marker when it was cut.
    """
    if limit is None or len(text) <= limit:
        return text
    return f"{text[:limit]}... [+{len(text) - limit} chars]"


def result_text(content: Any) -> str:
    """Flatten a ``tool_result`` block's content to text.

    Args:
        content: A string, or a list of blocks such as text and image.

    Returns:
        The text parts joined, with other blocks named in brackets.
    """
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return "" if content is None else json.dumps(content)
    parts = []
    for block in content:
        if not isinstance(block, dict):
            parts.append(str(block))
        elif block.get("type") == "text":
            parts.append(str(block.get("text", "")))
        else:
            parts.append(f"[{block.get('type', 'unknown')}]")
    return " ".join(parts)


def entries(record: dict[str, Any], max_chars: int) -> Iterator[str]:
    """Yield the digest entries for one transcript line.

    User and assistant prose stays whole. Tool inputs, tool results, and
    injected meta text (skill bodies, image notes) are cut to ``max_chars``.

    Args:
        record: One parsed JSONL line.
        max_chars: The most characters to keep from a tool input or result.

    Yields:
        Entries without their number, such as ``assistant TEXT: ...``.
    """
    role = record.get("type")
    if role not in ("user", "assistant"):
        return
    message = record.get("message")
    if not isinstance(message, dict):
        return
    content = message.get("content")
    meta = bool(record.get("isMeta"))
    text_label = "META" if meta else "TEXT"
    text_limit = max_chars if meta else None
    if isinstance(content, str):
        yield f"{role} {text_label}: {one_line(clip(content, text_limit))}"
        return
    if not isinstance(content, list):
        return
    for block in content:
        if not isinstance(block, dict):
            continue
        kind = block.get("type")
        if kind == "text":
            text = str(block.get("text", ""))
            yield f"{role} {text_label}: {one_line(clip(text, text_limit))}"
        elif kind == "tool_use":
            name = block.get("name", "?")
            args = json.dumps(
                block.get("input"), ensure_ascii=False, separators=(",", ":")
            )
            call = short_id(block, "id")
            yield f"{role} TOOL_USE {name} #{call}: {one_line(clip(args, max_chars))}"
        elif kind == "tool_result":
            label = "RESULT ERR" if block.get("is_error") else "RESULT"
            text = result_text(block.get("content"))
            call = short_id(block, "tool_use_id")
            yield f"{role} {label} #{call}: {one_line(clip(text, max_chars))}"


def digest(path: Path, max_chars: int) -> Iterator[str]:
    """Yield the numbered digest lines of a transcript.

    Args:
        path: The transcript JSONL file.
        max_chars: The most characters to keep from a tool input or result.

    Yields:
        Lines such as ``[3] assistant TOOL_USE Bash: {...}``.
    """
    n = 0
    with path.open(encoding="utf-8", errors="replace") as lines:
        for line in lines:
            try:
                record = json.loads(line)
            except ValueError:
                continue
            if not isinstance(record, dict):
                continue
            for entry in entries(record, max_chars):
                n += 1
                yield f"[{n}] {entry}"


def subagents(path: Path) -> tuple[list[tuple[Path, str]], int]:
    """List a session's subagent transcripts, leaving out reflect's own.

    Args:
        path: The session transcript, ``<session-id>.jsonl``.

    Returns:
        Each kept transcript with its description, oldest first, and the
        number of reflect agents left out.
    """
    folder = path.with_suffix("") / "subagents"
    if not folder.is_dir():
        return [], 0
    kept = []
    skipped = 0
    for transcript in sorted(
        folder.glob("agent-*.jsonl"), key=lambda p: p.stat().st_mtime
    ):
        try:
            meta = json.loads(
                transcript.with_suffix(".meta.json").read_text(encoding="utf-8")
            )
        except (OSError, ValueError):
            meta = {}
        if not isinstance(meta, dict):
            meta = {}
        description = str(meta.get("description") or "(no description)")
        if REFLECT_AGENT.match(description):
            skipped += 1
            continue
        agent_type = meta.get("agentType")
        kept.append(
            (transcript, f"{description} [{agent_type}]" if agent_type else description)
        )
    return kept, skipped


def main(argv: list[str] | None = None) -> int:
    """Print the digest and the subagent list for one transcript.

    Args:
        argv: Command-line arguments, without the program name.

    Returns:
        The exit status.
    """
    parser = argparse.ArgumentParser(description=(__doc__ or "").partition("\n")[0])
    parser.add_argument(
        "transcript", type=Path, help="a session or subagent .jsonl file"
    )
    parser.add_argument(
        "--max-chars",
        type=int,
        default=DEFAULT_MAX_CHARS,
        help="most characters kept from a tool input, tool result, or meta text"
        f" (default {DEFAULT_MAX_CHARS})",
    )
    args = parser.parse_args(argv)
    path: Path = args.transcript.expanduser().resolve()
    if not path.is_file():
        parser.error(f"no such file: {path}")
    if args.max_chars < 1:
        parser.error("--max-chars must be at least 1")

    # A lone surrogate from a JSON escape such as \ud83d cannot be encoded,
    # so print it escaped rather than stop partway through.
    if isinstance(sys.stdout, io.TextIOWrapper):
        sys.stdout.reconfigure(errors="backslashreplace")
    print(f"# Digest of {path}")
    for line in digest(path, args.max_chars):
        print(line)

    kept, skipped = subagents(path)
    if kept or skipped:
        print()
        print(
            f"# Subagent transcripts ({len(kept)}, {skipped} reflect agents left out)"
        )
        for transcript, description in kept:
            print(f"{transcript}  {description}")
    return 0


if __name__ == "__main__":
    try:
        status = main()
        sys.stdout.flush()
    except BrokenPipeError:
        # The reader, such as `head`, closed the pipe. Point stdout at
        # /dev/null so the flush at exit does not raise again.
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        status = 0
    sys.exit(status)
