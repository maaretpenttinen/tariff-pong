// server.js (Modified)
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Mode Detection ---
// Read command line arguments (index 2 onwards)
const args = process.argv.slice(2);
const isBotMatchMode = args.includes('--botmatch');
console.log(`Server starting in ${isBotMatchMode ? 'Bot vs. Bot' : 'Player vs. Bot'} mode.`);
// --- End Mode Detection ---

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- API Endpoint for Game Mode ---
app.get('/api/getmode', (req, res) => {
    res.json({ mode: isBotMatchMode ? 'bot' : 'player' });
});
// --- End API Endpoint ---

// Optional: Explicitly serve index.html for the root route (might not be needed)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (isBotMatchMode) {
        console.log("Mode: Bot vs. Bot (--botmatch flag detected)");
    } else {
        console.log("Mode: Player vs. Bot (Default)");
    }
});