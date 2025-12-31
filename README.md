# EPUBCheck MCP Server

An MCP (Model Context Protocol) server that integrates EPUBCheck for EPUB validation. Enables AI assistants like Claude to validate EPUB files, check accessibility, extract metadata, and explain error codes.

## Features

- **EPUB Validation**: Full validation of EPUB 2 and EPUB 3 publications
- **Single File Validation**: Validate OPF, XHTML, NAV, or SVG files individually
- **Accessibility Checking**: Focused accessibility issue detection (ACC_* messages)
- **Metadata Extraction**: Extract publication metadata and structure information
- **Error Explanation**: Get detailed explanations for EPUBCheck error codes
- **Bundled EPUBCheck**: Includes EPUBCheck 5.3.0, no separate installation needed

## Requirements

- Node.js 18+
- Java 7+ (for running EPUBCheck)

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/epubcheck-mcp.git
cd epubcheck-mcp

# Install dependencies
npm install

# Build
npm run build
```

## Usage with Claude Code

Add to your Claude Code MCP settings (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "epubcheck": {
      "command": "node",
      "args": ["/path/to/epubcheck-mcp/dist/index.js"]
    }
  }
}
```

## Available Tools

### validate

Validate an EPUB file and return all errors, warnings, and usage suggestions.

```
validate(path: string, profile?: "default" | "dict" | "edupub" | "idx" | "preview")
```

### validate_opf

Validate a single OPF (Open Packaging Format) file.

```
validate_opf(path: string, version?: "2.0" | "3.0")
```

### validate_xhtml

Validate a single XHTML content document.

```
validate_xhtml(path: string, version?: "2.0" | "3.0")
```

### validate_nav

Validate an EPUB 3 navigation document (nav.xhtml).

```
validate_nav(path: string)
```

### validate_svg

Validate an SVG file for EPUB conformance.

```
validate_svg(path: string, version?: "2.0" | "3.0")
```

### check_accessibility

Check an EPUB file for accessibility issues only (ACC_* messages).

```
check_accessibility(path: string)
```

### get_metadata

Extract metadata and structural information from an EPUB file.

```
get_metadata(path: string)
```

### explain_error

Get a detailed explanation of an EPUBCheck error code.

```
explain_error(code: string)  // e.g., "OPF-073", "ACC-001", "PKG-008"
```

### list_checks

List all available EPUBCheck error codes, optionally filtered by category.

```
list_checks(category?: string)
// Categories: Accessibility, CSS, HTML, Media Overlay, Navigation, Package, Resource, Scripting
```

### get_version

Get the version of EPUBCheck being used.

```
get_version()
```

## Example Conversations

### Validating an EPUB

```
User: Validate my EPUB file at /path/to/book.epub

Claude: [Uses validate tool]

# Validation Results

**File:** book.epub
**EPUBCheck Version:** 5.3.0

## Summary
- Fatal Errors: 0
- Errors: 2
- Warnings: 3
- Usage: 5

## Messages

### Errors
- **OPF-014**: Missing dc:identifier
  - Location: OEBPS/content.opf:5
...
```

### Checking Accessibility

```
User: Check accessibility issues in my EPUB

Claude: [Uses check_accessibility tool]

# Accessibility Check Results

**File:** book.epub
**Issues Found:** 3

- **ACC-003**: Non-decorative images should have an alt attribute
  - Location: OEBPS/chapter1.xhtml:42
...
```

### Understanding Error Codes

```
User: What does error PKG-008 mean?

Claude: [Uses explain_error tool]

# PKG-008

**Category:** Package Structure
**Severity:** ERROR

## Description
Mimetype entry is not first

## How to Fix
Make mimetype the first entry in ZIP
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `EPUBCHECK_JAR_PATH` | Custom path to epubcheck.jar (optional) |

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Format code
npm run format
```

## Project Structure

```
epubcheck-mcp/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP server implementation
│   └── epubcheck/
│       ├── types.ts      # TypeScript types
│       ├── runner.ts     # EPUBCheck JAR runner
│       └── messages.ts   # Error code explanations
├── bin/
│   ├── epubcheck.jar     # Bundled EPUBCheck
│   └── lib/              # EPUBCheck dependencies
├── dist/                 # Built output
└── test/
    └── fixtures/         # Test EPUB files
```

## License

MIT

## Credits

- [EPUBCheck](https://github.com/w3c/epubcheck) - The official EPUB conformance checker
- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol specification
