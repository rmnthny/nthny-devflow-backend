const express = require("express");
const cors = require("cors");
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
    origin: function (origin, callback) {
      // Allow requests without an Origin header
      // such as browser navigation, Render health checks,
      // Postman, or curl.
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

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    service: "NTHNY DevFlow Backend",
    status: "running",
    version: "0.2"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

app.post("/api/review", (req, res) => {
  const { project, language, code } = req.body;

  if (
    typeof code !== "string" ||
    !code.trim()
  ) {
    return res.status(400).json({
      error: "Code is required."
    });
  }

  if (code.length > 50000) {
    return res.status(413).json({
      error: "Code snippet is too large."
    });
  }

  res.json({
    project:
      project || "Unknown project",

    language:
      language || "Unknown",

    review: {
      summary:
        "Mock review completed successfully.",

      strengths: [
        "Code was received by the DevFlow backend.",
        "The frontend-to-backend connection is working."
      ],

      issues: [
        "This is currently a mock review and does not use an AI model."
      ],

      suggestions: [
        "Add stronger input validation.",
        "Add structured error handling.",
        "Connect an authorized AI provider through the backend later."
      ]
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: "Internal server error."
  });
});

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `NTHNY DevFlow backend running on port ${PORT}`
    );
  }
);