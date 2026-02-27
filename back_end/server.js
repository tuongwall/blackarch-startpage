/* =========================================================
   ENTERPRISE SEARCH SUGGESTION SERVICE
   =========================================================
   Service Name:
   Hybrid AI Suggestion Gateway (Gemini + Web Tooling)

   Description:
   This service exposes a REST endpoint responsible for
   generating intelligent search suggestions using
   Google's Gemini API.

   Architecture Overview:
   - Express.js HTTP server
   - Environment-based configuration
   - Static frontend hosting
   - AI-powered suggestion endpoint
   - Graceful fallback handling

   Deployment Model:
   Single runtime serving both:
     • Static frontend assets
     • Backend AI suggestion API

   ========================================================= */


/* =========================
   ENVIRONMENT CONFIGURATION
   =========================
   Loads environment variables from .env file.
   Production environments should inject
   variables through secure CI/CD pipelines.
*/
require('@dotenvx/dotenvx').config();



/* =========================
   DEPENDENCY INITIALIZATION
   ========================= */
const express = require('express');
const cors = require('cors');
const path = require('path');



/* =========================
   APPLICATION BOOTSTRAP
   ========================= */
const app = express();

/*
   Enables Cross-Origin Resource Sharing.
   Required for:
   - Local development
   - Frontend-backend separation
   - Future microservice deployment
*/
app.use(cors());



/* =========================
   SECRET MANAGEMENT
   =========================
   Retrieves Gemini API key from environment.
   Never hardcode secrets in production code.
*/
const myKey = process.env.GEMINI_API_KEY;



/* =========================================================
   STATIC FRONTEND HOSTING
   =========================================================
   Serves compiled frontend assets.

   Design Decision:
   Allows unified deployment using a single
   Node.js runtime instead of separate servers.

   This simplifies:
   - Local development
   - Small-scale production hosting
*/
const frontendPath = path.join(__dirname, '../front_end');
app.use(express.static(frontendPath));



/* =========================================================
   API ENDPOINT: /api/suggest
   =========================================================
   Method: GET
   Query Parameter:
     q (string) → user search input

   Responsibility:
   - Accept user input
   - Construct AI prompt
   - Call Gemini generateContent endpoint
   - Return short optimized suggestion

   Response Format:
     {
       suggestion: string
     }

   SLA Considerations:
   - AI call may introduce latency
   - Includes fallback strategy
   ========================================================= */
app.get('/api/suggest', async (req, res) => {

    const query = req.query.q;

    /*
       Input Validation:
       If query is empty or undefined,
       return empty suggestion to prevent
       unnecessary API invocation.
    */
    if (!query) return res.json({ suggestion: "" });

    try {

        /*
           Prompt Engineering Layer:
           Enforces constraints:
           - ≤10 words
           - Natural phrasing
           - Google-like suggestion style
           - No punctuation
        */
        const prompt = `
        Imagine you're a search engine.
        Based on the keywords the user is typing: "${query}",
        Write a very short search suggestion (≤10 words),
        natural like Google Suggest,
        prioritize common question types,
        return only the content, without punctuation.
        `;

        /*
           External API Invocation:
           Google Gemini generateContent endpoint.

           Tooling Enabled:
           - googleSearch tool allows
             real-time internet retrieval.
        */
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${myKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }]
                        }
                    ],
                    tools: [
                        { googleSearch: {} }
                    ]
                })
            }
        );

        const data = await response.json();


        /*
           API Error Handling:
           Handles:
           - Invalid API key
           - Quota exceeded
           - Model configuration errors
        */
        if (data.error) {
            console.error("Gemini API Error:", data.error.message);

            // Controlled fallback
            return res.json({
                suggestion: `✨ AI Search "${query}"`
            });
        }


        /*
           Response Extraction:
           Navigates Gemini response structure:
           data.candidates[0].content.parts[0].text
        */
        const aiText =
            data.candidates[0].content.parts[0].text
                .replace(/\n/g, "")
                .trim();


        /*
           Standardized Response Contract:
           Returns enriched suggestion to frontend.
        */
        res.json({
            suggestion: `✨ AI responded: ${aiText}`
        });

    }

    /*
       Global Exception Handling:
       Catches:
       - Network failures
       - Unexpected JSON shape
       - Runtime errors
    */
    catch (error) {

        console.error("AI Invocation Failure:", error);

        res.json({
            suggestion: `✨ AI unavailable for "${query}"`
        });
    }
});



/* =========================================================
   SERVER INITIALIZATION
   =========================================================
   Default Port: 3000
   Production environments should override
   via process.env.PORT.
   ========================================================= */
const PORT = 3000;

app.listen(PORT, () => {

    console.log(`🚀 Application running at http://localhost:${PORT}`);
    console.log(`🧠 AI Suggestion API available at /api/suggest?q=...`);
});