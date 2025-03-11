const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');
const app = express();
app.use(cors());
const PORT = 5000;

// Middleware
app.use(bodyParser.json());

// Initialize Google Generative AI with your API key
const genAI = new GoogleGenerativeAI('AIzaSyDQQjiL7HKDDXv4RPjaYrchKbCHjJWYnq0');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Store session conversation history (for simplicity, storing in memory)
let conversationHistory = {};

// Endpoint to analyze the text
app.post('/analyze', async (req, res) => {
    const { text, sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ description: "Session ID is required" });
    }

    // Initialize conversation history for a session if not exists
    if (!conversationHistory[sessionId]) {
        conversationHistory[sessionId] = [];
    }

    // Save user's question to the session history
    conversationHistory[sessionId].push({ role: 'user', content: text });

    // Build conversation context from history
    const previousConversations = conversationHistory[sessionId]
        .map((entry) => `${entry.role}: ${entry.content}`)
        .join("\n");

    // Create a prompt with the current question and the previous conversation
    const prompt = `Here is the conversation so far:\n${previousConversations}\n\nBased on the above, analyze the following text and determine if it is good for health in 150 words: ${text}`;

    try {
        const result = await model.generateContent(prompt); // Generate content based on the prompt
        const description = result.response.text(); // Get the AI response

        // Add AI response to the session history
        conversationHistory[sessionId].push({ role: 'ai', content: description });

        return res.json({ description, history: conversationHistory[sessionId] }); // Return the AI response and the conversation history
    } catch (error) {
        console.error("Error generating content:", error);
        return res.status(500).json({ description: "Failed to analyze the text." });
    }
});

// Clear conversation history if needed
app.post('/clear-history', (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId || !conversationHistory[sessionId]) {
        return res.status(400).json({ description: "Invalid session ID" });
    }

    delete conversationHistory[sessionId]; // Clear history for the session

    res.json({ description: "History cleared" });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
