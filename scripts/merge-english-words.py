#!/usr/bin/env python3
"""data/english/words.json (48MB) を分割ファイルから再結合する。

背景: GitHub 連携ツールの1回あたり送信上限 16MB を超えるため、
words.json 本体は data/english/words-part-{1..4}.json (各約12MB) として
リポジトリに置き、CI でテストの前にこのスクリプトで1本に戻す。
再結合結果は version.json の words.sha256 と照合し、不一致なら失敗する。
Python で結合するのは、元の words.json が Python の json.dumps
(ensure_ascii=False, separators=(',', ':')) で作られており、
浮動小数点 (例: 5.0) の表記までバイト一致させるため。
使い方: python3 scripts/merge-english-words.py
"""
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIR = ROOT / "data" / "english"


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def main() -> int:
    manifest = json.loads((DIR / "words-parts.json").read_text(encoding="utf-8"))
    version = json.loads((DIR / "version.json").read_text(encoding="utf-8"))
    expected_sha = version["words"]["sha256"]
    expected_entries = version["words"].get("entries", manifest["totalEntries"])

    words = []
    for part in manifest["parts"]:
        raw = (DIR / part["file"]).read_bytes()
        if sha256(raw) != part["sha256"]:
            print(f"sha256 mismatch: {part['file']}", file=sys.stderr)
            return 1
        chunk = json.loads(raw.decode("utf-8"))
        if not isinstance(chunk, list) or len(chunk) != part["entries"]:
            print(f"entry count mismatch: {part['file']}", file=sys.stderr)
            return 1
        words.extend(chunk)
        print(f"{part['file']}: {len(chunk)} entries ok")
    if len(words) != expected_entries:
        print(f"total entries {len(words)} != expected {expected_entries}", file=sys.stderr)
        return 1
    out = json.dumps(words, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if sha256(out) != expected_sha or sha256(out) != manifest["sha256"]:
        print("reassembled words.json sha256 mismatch", file=sys.stderr)
        return 1
    destination = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else DIR / "words.json"
    destination.write_bytes(out)
    print(json.dumps({"entries": len(words), "bytes": len(out), "sha256": sha256(out)}))
    print(f"merge ok: {destination} reassembled and verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
