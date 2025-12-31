import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import {
  runEpubCheck,
  getEpubCheckVersion,
  explainErrorCode,
  getAllErrorCodes,
  type EpubCheckResult,
  type ValidateMode,
  type ValidateProfile,
  type Message,
} from "./epubcheck/index.js";

const server = new Server(
  {
    name: "epubcheck-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: "validate",
    description:
      "Validate an EPUB file and return all errors, warnings, and usage suggestions. Use this for complete EPUB package validation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the EPUB file",
        },
        profile: {
          type: "string",
          enum: ["default", "dict", "edupub", "idx", "preview"],
          description: "Validation profile (optional, default: 'default')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "validate_opf",
    description:
      "Validate a single OPF (Open Packaging Format) file. Use this when you want to check only the package document without validating the entire EPUB.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the OPF file",
        },
        version: {
          type: "string",
          enum: ["2.0", "3.0"],
          description: "EPUB version (optional, default: 3.0)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "validate_xhtml",
    description:
      "Validate a single XHTML content document. Use this to check individual content files for HTML/XHTML conformance.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the XHTML file",
        },
        version: {
          type: "string",
          enum: ["2.0", "3.0"],
          description: "EPUB version (optional, default: 3.0)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "validate_nav",
    description:
      "Validate an EPUB 3 navigation document (nav.xhtml). Use this to check the table of contents and navigation structure.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the navigation document",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "validate_svg",
    description:
      "Validate an SVG file for EPUB conformance. Use this when checking SVG images or SVG content documents.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the SVG file",
        },
        version: {
          type: "string",
          enum: ["2.0", "3.0"],
          description: "EPUB version (optional, default: 3.0)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "check_accessibility",
    description:
      "Check an EPUB file for accessibility issues only. Returns only ACC_* messages related to accessibility compliance (WCAG, EPUB Accessibility).",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the EPUB file",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "get_metadata",
    description:
      "Extract metadata and structural information from an EPUB file. Returns title, creator, language, publication info, and content structure.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the EPUB file",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "explain_error",
    description:
      "Get a detailed explanation of an EPUBCheck error code. Provides description, severity, category, and suggestions for fixing the issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "Error code (e.g., 'OPF-073', 'ACC-001', 'PKG-008')",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "list_checks",
    description:
      "List all available EPUBCheck error codes and their categories. Optionally filter by category (Accessibility, CSS, HTML, Navigation, Package, Resource, etc.).",
    inputSchema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description:
            "Filter by category (optional). Available: Accessibility, CSS, HTML, Media Overlay, Navigation, Navigation (NCX), Package, Package Structure, Resource, Scripting",
        },
      },
    },
  },
  {
    name: "get_version",
    description:
      "Get the version of EPUBCheck being used by this MCP server.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "validate":
        return await handleValidate(args);
      case "validate_opf":
        return await handleValidateOpf(args);
      case "validate_xhtml":
        return await handleValidateXhtml(args);
      case "validate_nav":
        return await handleValidateNav(args);
      case "validate_svg":
        return await handleValidateSvg(args);
      case "check_accessibility":
        return await handleCheckAccessibility(args);
      case "get_metadata":
        return await handleGetMetadata(args);
      case "explain_error":
        return await handleExplainError(args);
      case "list_checks":
        return await handleListChecks(args);
      case "get_version":
        return await handleGetVersion();
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Tool handlers
async function handleValidate(args: Record<string, unknown>) {
  const path = args.path as string;
  const profile = (args.profile as ValidateProfile) || "default";

  const result = await runEpubCheck({ path, profile });
  return {
    content: [{ type: "text", text: formatValidationResult(result) }],
  };
}

async function handleValidateOpf(args: Record<string, unknown>) {
  const path = args.path as string;
  const version = (args.version as "2.0" | "3.0") || "3.0";

  const result = await runEpubCheck({ path, mode: "opf", version });
  return {
    content: [{ type: "text", text: formatValidationResult(result) }],
  };
}

async function handleValidateXhtml(args: Record<string, unknown>) {
  const path = args.path as string;
  const version = (args.version as "2.0" | "3.0") || "3.0";

  const result = await runEpubCheck({ path, mode: "xhtml", version });
  return {
    content: [{ type: "text", text: formatValidationResult(result) }],
  };
}

async function handleValidateNav(args: Record<string, unknown>) {
  const path = args.path as string;

  const result = await runEpubCheck({ path, mode: "nav", version: "3.0" });
  return {
    content: [{ type: "text", text: formatValidationResult(result) }],
  };
}

async function handleValidateSvg(args: Record<string, unknown>) {
  const path = args.path as string;
  const version = (args.version as "2.0" | "3.0") || "3.0";

  const result = await runEpubCheck({ path, mode: "svg", version });
  return {
    content: [{ type: "text", text: formatValidationResult(result) }],
  };
}

async function handleCheckAccessibility(args: Record<string, unknown>) {
  const path = args.path as string;

  const result = await runEpubCheck({ path });

  // Filter only accessibility-related messages
  const accessibilityMessages = result.messages.filter((m) =>
    m.ID.startsWith("ACC")
  );

  const filteredResult = {
    ...result,
    messages: accessibilityMessages,
  };

  let output = `# Accessibility Check Results\n\n`;
  output += `**File:** ${result.checker.filename}\n`;
  output += `**Issues Found:** ${accessibilityMessages.length}\n\n`;

  if (accessibilityMessages.length === 0) {
    output += `No accessibility issues detected.\n`;
    output += `\nNote: This checks for technical accessibility issues. `;
    output += `Manual review is still recommended for complete accessibility compliance.`;
  } else {
    output += formatMessages(accessibilityMessages);
  }

  return {
    content: [{ type: "text", text: output }],
  };
}

async function handleGetMetadata(args: Record<string, unknown>) {
  const path = args.path as string;

  const result = await runEpubCheck({ path });
  const pub = result.publication;

  let output = `# EPUB Metadata\n\n`;
  output += `## Basic Information\n`;
  output += `- **Title:** ${pub.title || "Not specified"}\n`;
  output += `- **Creator:** ${pub.creator?.join(", ") || "Not specified"}\n`;
  output += `- **Publisher:** ${pub.publisher || "Not specified"}\n`;
  output += `- **Language:** ${pub.language || "Not specified"}\n`;
  output += `- **Identifier:** ${pub.identifier || "Not specified"}\n`;
  output += `- **Date:** ${pub.date || "Not specified"}\n`;

  if (pub.subject && pub.subject.length > 0) {
    output += `- **Subjects:** ${pub.subject.join(", ")}\n`;
  }
  if (pub.description) {
    output += `- **Description:** ${pub.description}\n`;
  }
  if (pub.rights) {
    output += `- **Rights:** ${pub.rights}\n`;
  }

  output += `\n## Technical Details\n`;
  output += `- **EPUB Version:** ${pub.ePubVersion || "Unknown"}\n`;
  output += `- **Spine Items:** ${pub.nSpines}\n`;
  output += `- **Rendition Layout:** ${pub.renditionLayout || "reflowable"}\n`;

  if (pub.renditionOrientation) {
    output += `- **Orientation:** ${pub.renditionOrientation}\n`;
  }
  if (pub.renditionSpread) {
    output += `- **Spread:** ${pub.renditionSpread}\n`;
  }

  output += `\n## Content Features\n`;
  output += `- **Has Audio:** ${pub.hasAudio ? "Yes" : "No"}\n`;
  output += `- **Has Video:** ${pub.hasVideo ? "Yes" : "No"}\n`;
  output += `- **Has Scripts:** ${pub.hasScripts ? "Yes" : "No"}\n`;
  output += `- **Has Fixed Format:** ${pub.hasFixedFormat ? "Yes" : "No"}\n`;
  output += `- **Has Encryption:** ${pub.hasEncryption ? "Yes" : "No"}\n`;
  output += `- **Has Remote Resources:** ${pub.hasRemoteResources ? "Yes" : "No"}\n`;

  if (pub.embeddedFonts && pub.embeddedFonts.length > 0) {
    output += `\n## Embedded Fonts\n`;
    pub.embeddedFonts.forEach((font) => {
      output += `- ${font}\n`;
    });
  }

  if (pub.references && pub.references.length > 0) {
    output += `\n## External References\n`;
    pub.references.forEach((ref) => {
      output += `- ${ref}\n`;
    });
  }

  return {
    content: [{ type: "text", text: output }],
  };
}

async function handleExplainError(args: Record<string, unknown>) {
  const code = args.code as string;

  const explanation = explainErrorCode(code);

  if (!explanation) {
    return {
      content: [
        {
          type: "text",
          text: `Unknown error code: ${code}\n\nUse 'list_checks' to see all available error codes.`,
        },
      ],
    };
  }

  let output = `# ${explanation.code}\n\n`;
  output += `**Category:** ${explanation.category}\n`;
  output += `**Severity:** ${explanation.severity}\n\n`;
  output += `## Description\n${explanation.description}\n\n`;

  if (explanation.suggestion) {
    output += `## How to Fix\n${explanation.suggestion}\n`;
  }

  return {
    content: [{ type: "text", text: output }],
  };
}

async function handleListChecks(args: Record<string, unknown>) {
  const category = args.category as string | undefined;

  let codes = getAllErrorCodes();

  if (category) {
    codes = codes.filter(
      (c) => c.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (codes.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: category
            ? `No error codes found for category: ${category}`
            : "No error codes available",
        },
      ],
    };
  }

  // Group by category
  const byCategory = new Map<string, typeof codes>();
  for (const code of codes) {
    const cat = code.category;
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(code);
  }

  let output = `# EPUBCheck Error Codes\n\n`;
  output += `Total: ${codes.length} codes\n\n`;

  for (const [cat, catCodes] of byCategory) {
    output += `## ${cat} (${catCodes.length})\n\n`;
    for (const code of catCodes) {
      output += `- **${code.code}** [${code.severity}]: ${code.description}\n`;
    }
    output += `\n`;
  }

  return {
    content: [{ type: "text", text: output }],
  };
}

async function handleGetVersion() {
  const version = await getEpubCheckVersion();

  return {
    content: [
      {
        type: "text",
        text: `EPUBCheck version: ${version}\nMCP Server version: 0.1.0`,
      },
    ],
  };
}

// Formatting helpers
function formatValidationResult(result: EpubCheckResult): string {
  const { checker, messages } = result;

  let output = `# Validation Results\n\n`;
  output += `**File:** ${checker.filename}\n`;
  output += `**EPUBCheck Version:** ${checker.checkerVersion}\n`;
  output += `**Check Date:** ${checker.checkDate}\n`;
  output += `**Elapsed Time:** ${checker.elapsedTime}ms\n\n`;

  output += `## Summary\n`;
  output += `- Fatal Errors: ${checker.nFatal}\n`;
  output += `- Errors: ${checker.nError}\n`;
  output += `- Warnings: ${checker.nWarning}\n`;
  output += `- Usage: ${checker.nUsage}\n\n`;

  if (messages.length === 0) {
    output += `**Status: VALID** - No issues found.\n`;
  } else {
    output += formatMessages(messages);
  }

  return output;
}

function formatMessages(messages: Message[]): string {
  let output = `## Messages\n\n`;

  // Group by severity
  const fatal = messages.filter((m) => m.severity === "FATAL");
  const errors = messages.filter((m) => m.severity === "ERROR");
  const warnings = messages.filter((m) => m.severity === "WARNING");
  const info = messages.filter((m) => m.severity === "INFO");
  const usage = messages.filter((m) => m.severity === "USAGE");

  if (fatal.length > 0) {
    output += `### Fatal Errors\n`;
    fatal.forEach((m) => (output += formatMessage(m)));
    output += `\n`;
  }

  if (errors.length > 0) {
    output += `### Errors\n`;
    errors.forEach((m) => (output += formatMessage(m)));
    output += `\n`;
  }

  if (warnings.length > 0) {
    output += `### Warnings\n`;
    warnings.forEach((m) => (output += formatMessage(m)));
    output += `\n`;
  }

  if (info.length > 0) {
    output += `### Info\n`;
    info.forEach((m) => (output += formatMessage(m)));
    output += `\n`;
  }

  if (usage.length > 0) {
    output += `### Usage Suggestions\n`;
    usage.forEach((m) => (output += formatMessage(m)));
    output += `\n`;
  }

  return output;
}

function formatMessage(message: Message): string {
  let output = `- **${message.ID}**: ${message.message}\n`;

  if (message.locations && message.locations.length > 0) {
    const loc = message.locations[0];
    output += `  - Location: ${loc.path}`;
    if (loc.line > 0) {
      output += `:${loc.line}`;
      if (loc.column > 0) {
        output += `:${loc.column}`;
      }
    }
    output += `\n`;

    if (message.additionalLocations > 0) {
      output += `  - (and ${message.additionalLocations} more locations)\n`;
    }
  }

  if (message.suggestion) {
    output += `  - Suggestion: ${message.suggestion}\n`;
  }

  return output;
}

// Start server
export async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("EPUBCheck MCP server running on stdio");
}
