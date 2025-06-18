// These are required libraries for server setup, file management, and Gemini integration.
const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Loads .env file and prepares the Express app to receive JSON bodies
dotenv.config();
const app = express();
app.use(express.json());

// Initializes a Gemini 2.0 Flash model using your API key.
const genAI = new GoogleGenerativeAI (process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash'});
// Tells Multer to store uploaded files temporarily in /uploads.
const upload = multer({ dest: 'uploads/' });

const PORT = 3000;
app.listen(PORT, () => {
console.log(`Gemini API server is running at http://localhost:${PORT}`);
});

// Endopoint /generate-text
app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;

  try {
    const result = await model.generateContent( prompt );
    const response = await result.response;
    res.json({ output: response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Converts an image file to a format suitable for Gemini's generative model.
const imageToGenerativePart = (filePath) => ({
    inlineData: {
        data: fs.readFileSync(filePath).toString('base64'),
        mimeType: 'image/png',
    },
});

// Endpotint /generate-from-image
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || 'Describe the image';
    const image = imageToGenerativePart(req.file.path);
    try {
        const result = await model.generateContent([prompt, image]);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(req.file.path)
    }
});

// Endpoint /generate-from-document
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');
    const mimeType = req.file.mimetype

    try {
        const documentPart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType,
            },
        };
    const result = await model.generateContent(['Analyze this document', documentPart]);
    const response = await result.response;
    res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

// Endpoint /generate-from-audio
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const audioBuffer = fs.readFileSync(req.file.path);
    const base64Audio = audioBuffer.toString('base64');
    const audioPart = {
        inlineData: {
            data: base64Audio,
            mimeType: req.file.mimetype,
        }
    };
    
    try{
        const result = await model.generateContent([
          'Transcribe or analize the following audio', audioPart
        ]);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally{
        fs.unlinkSync(req.file.path);
    }
});