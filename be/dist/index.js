"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const API_KEY = process.env.API_KEY;
const together_ai_1 = __importDefault(require("together-ai"));
const express_1 = __importDefault(require("express"));
const node_1 = require("./defaults/node");
const react_1 = require("./defaults/react");
const prompt_1 = require("./prompt");
const prompts_1 = require("./prompts");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});
app.use((0, cors_1.default)({
    origin: "http://localhost:5173", // Allow requests from frontend
    methods: "GET,POST,PUT,DELETE", // Allow these methods
    allowedHeaders: "Content-Type,Authorization"
}));
const together = new together_ai_1.default({
    apiKey: API_KEY
});
app.post('/templates', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const prompt = req.body.prompt;
    const response = yield together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
            { role: 'user', content: prompt },
            { role: 'system', content: "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or react Do not return anyting extra" }
        ],
    });
    const answer = (_b = (_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.trim();
    console.log(answer);
    if ((answer === null || answer === void 0 ? void 0 : answer.toLowerCase()) == 'react') {
        res.json({
            prompts: [prompt_1.BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${react_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [react_1.basePrompt]
        });
        return;
    }
    if ((answer === null || answer === void 0 ? void 0 : answer.toLowerCase()) == 'node') {
        res.json({
            prompts: [prompt_1.BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${node_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [node_1.basePrompt]
        });
        return;
    }
    res.status(403).json({ message: "You can't access this" });
}));
// Foward the messages to the LLM model
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const messages = req.body.messages;
        const response = yield together.chat.completions.create({
            model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
            messages: [...messages,
                { role: 'system', content: (0, prompts_1.getSystemPrompt)() }
            ],
        });
        if (!((_c = (_b = (_a = response === null || response === void 0 ? void 0 : response.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content)) {
            throw new Error('Invalid response format from API');
        }
        res.json({
            response: (_d = response.choices[0].message) === null || _d === void 0 ? void 0 : _d.content
        });
    }
    catch (error) {
        console.log("Error Occured in the chatpoint", error);
        const statusCode = error.status || 500;
        res.status(statusCode).json({
            error: ((_f = (_e = error.error) === null || _e === void 0 ? void 0 : _e.error) === null || _f === void 0 ? void 0 : _f.message) || error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}));
// app.post('/chat', async (req  , res) => {
//   try {
//       const { messages } = req.body;
//       // Validate the input messages
//       if (!Array.isArray(messages) || messages.length === 0) {
//           return res.status(400).json({ message: "Messages must be a non-empty array." });
//       }
//       // Prepare messages for the AI
//       const chatMessages = [
//           ...messages,
//           { role: 'system', content: getSystemPrompt() }
//       ];
//       const response = await together.chat.completions.create({
//           model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
//           messages: chatMessages,
//       });
//       const answer = response.choices[0].text?.trim();
//       // Return the AI response
//       return res.json({ response: answer });
//   } catch (error) {
//       console.error('Error in /chat:', error);
//       return res.status(500).json({ message: "Internal server error" });
//   }
// });
app.listen(3000, () => {
    console.log("Server Running");
});
