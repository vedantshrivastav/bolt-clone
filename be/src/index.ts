require("dotenv").config()

const API_KEY = process.env.API_KEY

import Together from "together-ai";

import express from "express"
import fs from "fs"
import {basePrompt as nodeBasePrompt} from './defaults/node'
import {basePrompt as reactBasePrompt} from './defaults/react'
import { BASE_PROMPT } from "./prompt";
import { getSystemPrompt } from "./prompts";
import cors from 'cors'
import { Request, Response } from 'express';

const app = express()

app.use(express.json()) 
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
  });
  
app.use(cors({
    origin: "http://localhost:5173", // Allow requests from frontend
    methods: "GET,POST,PUT,DELETE",  // Allow these methods
    allowedHeaders: "Content-Type,Authorization"
  }));

const together = new Together({
     apiKey : API_KEY
});


app.post('/templates', async (req,res) => {
    const prompt = req.body.prompt
    
    const response = await together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          { role: 'user', content: prompt },
          { role : 'system' , content : "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or react Do not return anyting extra"}
        ],
      });
      const answer = response.choices[0].message?.content?.trim()
      console.log(answer)
      if(answer?.toLowerCase() == 'react'){
        res.json({
            prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [reactBasePrompt]
        })
        return
      }
      if(answer?.toLowerCase() == 'node'){
        res.json({
            prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [nodeBasePrompt]
        })
        return
      }

      res.status(403).json({message : "You can't access this"})
})

// Foward the messages to the LLM model
app.post('/chat' , async(req,res) => {
   try{
    const messages = req.body.messages
    
    const response = await together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages:[...messages,
            {role : 'system', content : getSystemPrompt()}
        ],
      });
     if (!response?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from API');
    }
    res.json({
      response : response.choices[0].message?.content
    })
   }catch(error  : any){
      console.log("Error Occured in the chatpoint", error)
      const statusCode = error.status || 500;
      res.status(statusCode).json({
      error: error.error?.error?.message || error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
});
   }

})




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



app.listen(3000 ,()=>{
    console.log("Server Running")
})