const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
require("dotenv").config();

const app = express();

const allowedOrigins = [
  "https://rmnthny.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "http://localhost:5500"
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Not allowed by CORS")
      );
    }
  })
);

app.use(
  express.json({
    limit: "1mb"
  })
);

const anthropic =
  process.env.ANTHROPIC_API_KEY
    ? new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      })
    : null;

const CLAUDE_MODEL =
  process.env.ANTHROPIC_MODEL || null;

app.get("/", (req, res) => {
  res.json({
    service: "NTHNY DevFlow Backend",
    status: "running",
    version: "0.3",
    claudeConfigured: Boolean(
      anthropic && CLAUDE_MODEL
    )
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    claudeConfigured: Boolean(
      anthropic && CLAUDE_MODEL
    ),
    timestamp: new Date().toISOString()
  });
});

app.post("/api/review", async (req, res) => {
  try {
    const {
      project,
      language,
      code
    } = req.body;

    if (
      typeof code !== "string" ||
      !code.trim()
    ) {
      return res.status(400).json({
        error: "Code is required."
      });
    }

    if (code.length > 20000) {
      return res.status(413).json({
        error:
          "Code snippet is too large. Keep it below 20,000 characters."
      });
    }

   if (!anthropic || !CLAUDE_MODEL) {
  return res.json({
    project:
      project || "Unknown project",

    language:
      language || "Unknown",

    source: "mock",

    review: {
      summary:
        "Mock review completed successfully.",

      strengths: [
        "Code was received by the DevFlow backend.",
        "The frontend-to-backend connection is working."
      ],

      issues: [
        "Claude API integration is prepared but is not currently active."
      ],

      suggestions: [
        "Add stronger input validation where needed.",
        "Add structured error handling.",
        "Enable Claude review when an authorized API credential becomes available."
      ]
    }
  });
}

    const prompt = `
You are the AI code-review assistant inside NTHNY DevFlow.

Review the supplied code carefully.

Project:
${project || "Unknown project"}

Programming language:
${language || "Unknown"}

Code:
--- BEGIN CODE ---
${code}
--- END CODE ---

Focus on:
- correctness
- readability
- input validation
- error handling
- security
- maintainability
- performance where relevant
- database safety where relevant

Do not invent problems that are not supported by the code.

Return ONLY valid JSON using this exact structure:

{
  "summary": "short overall assessment",
  "strengths": [
    "strength 1",
    "strength 2"
  ],
  "issues": [
    "issue 1",
    "issue 2"
  ],
  "suggestions": [
    "suggestion 1",
    "suggestion 2"
  ]
}

Keep the review concise and practical.
`;

    const message =
      await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

    const responseText =
      message.content
        .filter(
          (block) =>
            block.type === "text"
        )
        .map(
          (block) => block.text
        )
        .join("\n")
        .trim();

    if (!responseText) {
      throw new Error(
        "Claude returned an empty response."
      );
    }

    let cleanedResponse =
      responseText;

    if (
      cleanedResponse.startsWith("```")
    ) {
      cleanedResponse =
        cleanedResponse.replace(
          /^```(?:json)?\s*/i,
          ""
        );

      cleanedResponse =
        cleanedResponse.replace(
          /\s*```$/,
          ""
        );
    }

    let review;

    try {
      review =
        JSON.parse(cleanedResponse);
    } catch (error) {
      console.error(
        "Invalid Claude JSON response:",
        responseText
      );

      return res.status(502).json({
        error:
          "Claude returned an unexpected response format."
      });
    }

    review.summary =
      String(
        review.summary ||
          "Review completed."
      );

    review.strengths =
      Array.isArray(
        review.strengths
      )
        ? review.strengths
            .map(String)
            .slice(0, 10)
        : [];

    review.issues =
      Array.isArray(
        review.issues
      )
        ? review.issues
            .map(String)
            .slice(0, 10)
        : [];

    review.suggestions =
      Array.isArray(
        review.suggestions
      )
        ? review.suggestions
            .map(String)
            .slice(0, 10)
        : [];

    return res.json({
      project:
        project || "Unknown project",

      language:
        language || "Unknown",

      source: "claude",

      model: CLAUDE_MODEL,

      review,

      usage: {
        inputTokens:
          message.usage?.input_tokens ??
          null,

        outputTokens:
          message.usage?.output_tokens ??
          null
      }
    });
  } catch (error) {
    console.error(
      "Claude review error:",
      error
    );

    if (error?.status === 401) {
      return res.status(500).json({
        error:
          "Claude API authentication failed."
      });
    }

    if (error?.status === 429) {
      return res.status(429).json({
        error:
          "Claude API rate limit reached."
      });
    }

    return res.status(500).json({
      error:
        "Claude code review failed."
    });
  }
});

app.use(
  (err, req, res, next) => {
    console.error(err);

    res.status(500).json({
      error:
        "Internal server error."
    });
  }
);

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `NTHNY DevFlow backend running on port ${PORT}`
    );

    console.log(
      `Claude configured: ${
        anthropic && CLAUDE_MODEL
          ? "yes"
          : "no"
      }`
    );
  }
);
