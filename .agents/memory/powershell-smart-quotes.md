---
name: PowerShell smart quotes
description: Curly quote punctuation in PowerShell strings can break parsing and misplace unterminated-string errors.
---

PowerShell treats curly quotation marks as quote delimiters. Smart apostrophes inside ordinary single-quoted text can terminate a string unexpectedly, while the parser reports the missing terminator much later in the file.

**Why:** The Windows CI parser reported an unterminated string at the launcher’s final message even though surrounding strings looked balanced; removing smart apostrophes made both launchers parse successfully.

**How to apply:** Prefer plain ASCII punctuation in PowerShell string literals. If user-facing copy needs apostrophes, choose a delimiter that remains unambiguous or escape the ASCII apostrophe correctly, and run the PowerShell parser before building.
