import os
from pathlib import Path

src_dir = Path("qshield-backend/frontend/src")

count = 0
for filepath in src_dir.rglob("*.*"):
    if filepath.suffix in [".js", ".jsx"]:
        content = filepath.read_text(encoding="utf-8")
        if "http://localhost:8000" in content:
            new_content = content.replace("http://localhost:8000", "")
            filepath.write_text(new_content, encoding="utf-8")
            count += 1
            print(f"Updated {filepath}")

print(f"Total files updated: {count}")
