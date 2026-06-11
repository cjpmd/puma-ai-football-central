#!/usr/bin/env python3
"""Render a per-function pass/fail/skip table from Deno's JUnit output.

Deno emits one <testsuite> per test file; the file name maps 1:1 to an edge
function (send-invitation-email.test.ts -> send-invitation-email).
Writes the table to stdout and, when running in GitHub Actions, to the job
summary ($GITHUB_STEP_SUMMARY).
"""
import os
import sys
import xml.etree.ElementTree as ET


def main(path: str) -> int:
    try:
        root = ET.parse(path).getroot()
    except (OSError, ET.ParseError) as e:
        print(f"edge-test-summary: cannot read {path}: {e}", file=sys.stderr)
        return 1

    suites = root.iter("testsuite")
    rows = []
    totals = {"pass": 0, "fail": 0, "skip": 0}
    for s in suites:
        name = os.path.basename(s.get("name", "?"))
        fn = name.replace(".test.ts", "")
        tests = int(s.get("tests", 0))
        failures = int(s.get("failures", 0)) + int(s.get("errors", 0))
        skipped = int(s.get("skipped", 0)) + int(s.get("disabled", 0))
        passed = tests - failures - skipped
        rows.append((fn, passed, failures, skipped))
        totals["pass"] += passed
        totals["fail"] += failures
        totals["skip"] += skipped

    rows.sort(key=lambda r: (-r[2], r[0]))  # failing functions first

    lines = [
        "## Edge function test summary",
        "",
        "| Function | Pass | Fail | Skip | Status |",
        "|---|---:|---:|---:|---|",
    ]
    for fn, passed, failures, skipped in rows:
        status = "❌ FAIL" if failures else ("⏭ all skipped" if passed == 0 else "✅ ok")
        lines.append(f"| {fn} | {passed} | {failures} | {skipped} | {status} |")
    lines.append(
        f"| **total** | **{totals['pass']}** | **{totals['fail']}** | **{totals['skip']}** | |"
    )
    table = "\n".join(lines)

    print(table)

    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        with open(step_summary, "a", encoding="utf-8") as f:
            f.write(table + "\n")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "test-results/edge-functions.xml"))
