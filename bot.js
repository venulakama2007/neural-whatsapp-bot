require('dotenv').config();

require('dotenv').config();

// Add this for Render deployment
const PORT = process.env.PORT || 3000;
const express = require('express');
const app = express();

// Health check endpoint for Render
app.get('/', (req, res) => {
    res.json({
        status: 'Neural AI WhatsApp Bot is running!',
        timestamp: new Date().toISOString(),
        botStatus: botStatus.isOnline ? 'Online' : 'Offline'
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Health check server running on port ${PORT}`);
});

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Add error handling for missing dependencies
try {
    console.log('Loading dependencies...');
} catch (error) {
    console.error('Error loading dependencies:', error);
    process.exit(1);
}

// Fixed Configuration for Image Generation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Updated working image generation models - correct endpoints
const IMAGE_MODELS = [
    'black-forest-labs/FLUX.1-schnell',
    'black-forest-labs/FLUX.1-dev',
    'stabilityai/stable-diffusion-xl-base-1.0',
    'runwayml/stable-diffusion-v1-5',
    'CompVis/stable-diffusion-v1-4'
];

// Chat memory storage (in production, use a database)
const chatMemory = new Map();
const MAX_MEMORY_MESSAGES = 10;

// Offline message queue
const offlineMessageQueue = new Map();
const userMessageTracker = new Map(); // Track user message frequency

// Store for tracking users and groups
const allowedUsers = new Set();
const allowedGroups = new Set();

// Pre-add specific users
const preAllowedUsers = [
    '724070509',
    '767387335',
    '763979857',
    '768044107',
    '777234560',
];

// Pre-allowed groups
const preAllowedGroups = [
    '120363352981396311@g.us',
    '120363419826257502@g.us',
];

// Add pre-allowed users and groups
preAllowedUsers.forEach(number => {
    allowedUsers.add(number);
    console.log(`Pre-added user to allowed list: ${number}`);
});

preAllowedGroups.forEach(groupId => {
    allowedGroups.add(groupId);
    console.log(`Pre-added group to allowed list: ${groupId}`);
});

// Bot status tracking
let botStatus = {
    isOnline: false,
    lastSeen: null,
    isInitialized: false
};

// Initialize WhatsApp client
console.log('Initializing WhatsApp client...');
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

console.log('WhatsApp client created successfully!');


function detectLanguage(text) {
    // Simple Sinhala detection - check for Sinhala Unicode characters
    const sinhalaRegex = /[\u0D80-\u0DFF]/;
    const englishRegex = /[a-zA-Z]/;
    
    const hasSinhala = sinhalaRegex.test(text);
    const hasEnglish = englishRegex.test(text);
    
    if (hasSinhala && hasEnglish) return 'mixed';
    if (hasSinhala) return 'sinhala';
    if (hasEnglish) return 'english';
    return 'english'; // default
}

// Check if message is code-related
function isCodeMessage(text) {
    const codeKeywords = [
        'code', 'javascript', 'python', 'html', 'css', 'function', 'variable',
        'programming', 'syntax', 'debug', 'error', 'algorithm', 'database',
        'api', 'json', 'xml', 'sql', 'react', 'node', 'php', 'java', 'c++',
        'script', 'class', 'method', 'array', 'object', 'loop', 'if', 'else',
        'import', 'export', 'console.log', 'print(', 'def ', 'function(',
        '```', '</', '/>', '{', '}', '&&', '||', '==', '!=', 'true', 'false',
        'null', 'undefined', 'var ', 'let ', 'const ', 'return', 'try', 'catch'
    ];
    
    const lowerText = text.toLowerCase();
    return codeKeywords.some(keyword => lowerText.includes(keyword));
}

// User message tracking for offline handling
function trackUserMessage(userId) {
    const now = Date.now();
    if (!userMessageTracker.has(userId)) {
        userMessageTracker.set(userId, []);
    }
    
    const userTimes = userMessageTracker.get(userId);
    userTimes.push(now);
    
    // Keep only messages from last 5 minutes
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    const recentMessages = userTimes.filter(time => time > fiveMinutesAgo);
    userMessageTracker.set(userId, recentMessages);
    
    return recentMessages.length;
}

// Check if user is sending too many messages (>3 in 5 minutes when offline)
function isUserSpamming(userId) {
    const messageCount = trackUserMessage(userId);
    return !botStatus.isOnline && messageCount > 3;
}

// Generate QR code for WhatsApp Web
client.on('qr', (qr) => {
    console.log('\n=== NEURAL AI WHATSAPP QR CODE ===');
    console.log('Scan this QR code with your NEW WhatsApp account:');
    console.log('Go to WhatsApp > Settings > Linked Devices > Link a Device');
    console.log('================================\n');
    
    try {
        qrcode.generate(qr, { small: true });
    } catch (error) {
        console.error('Error generating QR code:', error);
        console.log('Raw QR data:', qr);
    }
});

// Client ready
client.on('ready', () => {
    botStatus.isOnline = true;
    botStatus.isInitialized = true;
    botStatus.lastSeen = new Date();
    
    console.log('🤖 Neural AI WhatsApp Bot is ready!');
    console.log('📱 Bot Features:');
    console.log('   ✅ Bilingual AI Chat (English & Sinhala)');
    console.log('   ✅ Fixed Image Generation');
    console.log('   ✅ PDF Reading');
    console.log('   ✅ Offline Message Handling');
    console.log('   ✅ Smart Language Detection');
    console.log(`📊 Allowed users: ${allowedUsers.size}`);
    console.log(`📊 Allowed groups: ${allowedGroups.size}`);
    
    // Test image generation models
    testImageModels();
    
    // Process offline message queue
    processOfflineMessages();
});

// Handle authentication
client.on('authenticated', () => {
    console.log('✅ Neural AI authenticated successfully!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    botStatus.isOnline = false;
});

// Handle disconnection
client.on('disconnected', (reason) => {
    console.log('📱 Neural AI disconnected:', reason);
    botStatus.isOnline = false;
    botStatus.lastSeen = new Date();
});

// Chat memory functions
function getChatMemory(chatId) {
    if (!chatMemory.has(chatId)) {
        chatMemory.set(chatId, []);
    }
    return chatMemory.get(chatId);
}

function addToMemory(chatId, userMessage, aiResponse) {
    const memory = getChatMemory(chatId);
    memory.push({
        user: userMessage,
        ai: aiResponse,
        timestamp: new Date().toISOString()
    });
    
    if (memory.length > MAX_MEMORY_MESSAGES) {
        memory.splice(0, memory.length - MAX_MEMORY_MESSAGES);
    }
}

function clearChatMemory(chatId) {
    chatMemory.delete(chatId);
    console.log(`🧹 Cleared chat memory for: ${chatId}`);
}

function getMemoryContext(chatId) {
    const memory = getChatMemory(chatId);
    if (memory.length === 0) return '';
    
    let context = '\n\nPrevious conversation context:\n';
    memory.slice(-5).forEach((msg) => {
        context += `User: ${msg.user}\nAI: ${msg.ai}\n`;
    });
    return context;
}

// Enhanced image generation function with proper error handling
async function generateImage(prompt) {
    console.log(`🎨 Generating image for prompt: "${prompt}"`);
    
    // Enhanced prompt for better results
    const enhancedPrompt = `high quality, detailed, masterpiece, ${prompt}`;
    
    // Try each model until one works
    for (let i = 0; i < IMAGE_MODELS.length; i++) {
        const modelName = IMAGE_MODELS[i];
        const modelUrl = `https://api-inference.huggingface.co/models/${modelName}`;
        
        try {
            console.log(`🔄 Trying model ${i + 1}/${IMAGE_MODELS.length}: ${modelName}`);
            
            // First, check if model is available
            const statusResponse = await axios.get(modelUrl, {
                headers: {
                    'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                },
                timeout: 10000
            }).catch(() => null);

            if (!statusResponse || statusResponse.status !== 200) {
                console.log(`❌ Model ${modelName} not accessible, trying next...`);
                continue;
            }
            
            // Generate image
            const requestData = {
                inputs: enhancedPrompt,
                parameters: {
                    negative_prompt: "blurry, bad quality, distorted, ugly, deformed, low resolution, watermark",
                    num_inference_steps: 20,
                    guidance_scale: 7.5,
                    width: 512,
                    height: 512
                },
                options: {
                    wait_for_model: true,
                    use_cache: false
                }
            };
            
            const response = await axios.post(modelUrl, requestData, {
                headers: {
                    'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
                timeout: 180000 // 3 minute timeout for image generation
            });

            // Check if we got a valid image response
            if (response.data && response.data.byteLength > 1000) {
                // Create temp directory if it doesn't exist
                const tempDir = path.join(__dirname, 'temp');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                
                const imagePath = path.join(tempDir, `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`);
                fs.writeFileSync(imagePath, response.data);
                
                // Verify the file was created and has content
                if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 1000) {
                    console.log(`✅ Image generated successfully with ${modelName}: ${imagePath}`);
                    return imagePath;
                } else {
                    console.log(`❌ Generated file is too small or corrupted with ${modelName}`);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }
            } else {
                console.log(`❌ Invalid response from ${modelName}: ${response.data?.byteLength || 0} bytes`);
            }
            
        } catch (error) {
            const status = error.response?.status;
            const statusText = error.response?.statusText;
            
            console.error(`❌ Model ${modelName} failed:`, {
                status: status,
                statusText: statusText,
                message: error.message
            });
            
            // Handle specific error cases
            if (status === 503) {
                console.log(`⏳ Model ${modelName} is loading, waiting 15 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 15000));
                
                // Retry the same model once after waiting
                try {
                    console.log(`🔄 Retrying ${modelName} after waiting...`);
                    const retryResponse = await axios.post(modelUrl, {
                        inputs: enhancedPrompt,
                        parameters: {
                            negative_prompt: "blurry, bad quality, distorted",
                            num_inference_steps: 15,
                            width: 512,
                            height: 512
                        },
                        options: {
                            wait_for_model: true
                        }
                    }, {
                        headers: {
                            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        responseType: 'arraybuffer',
                        timeout: 120000
                    });
                    
                    if (retryResponse.data && retryResponse.data.byteLength > 1000) {
                        const tempDir = path.join(__dirname, 'temp');
                        if (!fs.existsSync(tempDir)) {
                            fs.mkdirSync(tempDir, { recursive: true });
                        }
                        
                        const imagePath = path.join(tempDir, `image_${Date.now()}_retry.png`);
                        fs.writeFileSync(imagePath, retryResponse.data);
                        
                        if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 1000) {
                            console.log(`✅ Image generated successfully on retry with ${modelName}`);
                            return imagePath;
                        }
                    }
                } catch (retryError) {
                    console.error(`❌ Retry also failed for ${modelName}:`, retryError.message);
                }
            } else if (status === 401) {
                console.log(`❌ Authentication failed for ${modelName} - Check API key`);
            } else if (status === 404) {
                console.log(`❌ Model ${modelName} not found - Skipping`);
            } else if (status === 429) {
                console.log(`❌ Rate limit exceeded for ${modelName} - Waiting 30 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
            
            // Continue to next model
            continue;
        }
    }
    
    // If all models fail, try a simpler fallback approach
    console.log('🔄 All models failed, trying fallback approach...');
    
    try {
        // Simple fallback using just the basic model
        const fallbackModel = 'runwayml/stable-diffusion-v1-5';
        const response = await axios.post(`https://api-inference.huggingface.co/models/${fallbackModel}`, {
            inputs: prompt, // Use original prompt without enhancement
            options: {
                wait_for_model: true
            }
        }, {
            headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            },
            responseType: 'arraybuffer',
            timeout: 300000 // 5 minute timeout for fallback
        });
        
        if (response.data && response.data.byteLength > 1000) {
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const imagePath = path.join(tempDir, `image_fallback_${Date.now()}.png`);
            fs.writeFileSync(imagePath, response.data);
            
            if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 1000) {
                console.log(`✅ Image generated successfully with fallback method`);
                return imagePath;
            }
        }
    } catch (fallbackError) {
        console.error('❌ Fallback method also failed:', fallbackError.message);
    }
    
    console.error('❌ All image generation attempts failed');
    return null;
}

// Updated test function for image models
async function testImageModels() {
    console.log('🧪 Testing image generation models...');
    
    for (let i = 0; i < IMAGE_MODELS.length; i++) {
        const modelName = IMAGE_MODELS[i];
        const modelUrl = `https://api-inference.huggingface.co/models/${modelName}`;
        
        try {
            // First test: Check if model exists
            const statusResponse = await axios.get(modelUrl, {
                headers: {
                    'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                },
                timeout: 10000
            });
            
            if (statusResponse.status === 200) {
                console.log(`✅ ${modelName}: Model exists and accessible`);
                
                // Second test: Try a simple generation request
                try {
                    const testResponse = await axios.post(modelUrl, {
                        inputs: "test",
                        options: { wait_for_model: false }
                    }, {
                        headers: {
                            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 15000
                    });
                    
                    console.log(`✅ ${modelName}: Generation test successful (Status: ${testResponse.status})`);
                } catch (genError) {
                    const status = genError.response?.status;
                    if (status === 503) {
                        console.log(`⏳ ${modelName}: Model loading (normal for first use)`);
                    } else {
                        console.log(`⚠️ ${modelName}: Generation test failed (${status})`);
                    }
                }
            }
        } catch (error) {
            const status = error.response?.status || 'No response';
            const statusText = error.response?.statusText || error.message;
            
            if (status === 404) {
                console.log(`❌ ${modelName}: Model not found`);
            } else if (status === 401) {
                console.log(`❌ ${modelName}: Authentication failed`);
            } else {
                console.log(`❌ ${modelName}: ${status} - ${statusText}`);
            }
        }
    }
    
    console.log('\n💡 If all models fail:');
    console.log('1. Check your Hugging Face API key');
    console.log('2. Try again in a few minutes (models might be loading)');
    console.log('3. Consider using alternative models');
}

// PDF reading function
async function readPDF(filePath) {
    try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        return pdfData.text;
    } catch (error) {
        console.error('Error reading PDF:', error);
        return "PDF කියවීමේ ක්‍රියාවලිය සම්පූර්ණ කළ නොහැක. PDF reading feature needs pdf-parse package.";
    }
}

// Enhanced AI response function with language support
async function getAIResponse(userMessage, chatId, isGroup = false, groupName = '') {
    try {
        // Check for special commands
        if (userMessage.toLowerCase().includes('/clear') || userMessage.toLowerCase().includes('clear chat')) {
            clearChatMemory(chatId);
            return "🧹 Chat memory cleared! / චැට් මතකය මකා දමා ඇත!";
        }

        // Handle image generation commands
        const imageCommands = ['/generate image', 'create image', 'generate image', 'make image', 'draw image', 'image generate'];
        const isImageCommand = imageCommands.some(cmd => userMessage.toLowerCase().includes(cmd.toLowerCase()));
        
        if (isImageCommand) {
            let prompt = userMessage;
            imageCommands.forEach(cmd => {
                prompt = prompt.replace(new RegExp(cmd, 'gi'), '').trim();
            });
            
            if (!prompt || prompt.length < 3) {
                return "🎨 කරුණාකර ඔබට අවශ්‍ය image එකේ විස්තරයක් දෙන්න!\nPlease provide a description for the image!\n\nExamples:\n• 'Generate image of a beautiful sunset'\n• 'Create image of a cute cat'\n• 'Make image of a futuristic city'";
            }
            
            console.log(`🎨 Processing image generation request: "${prompt}"`);
            
            try {
                const imagePath = await generateImage(prompt);
                if (imagePath && fs.existsSync(imagePath)) {
                    return { 
                        type: 'image', 
                        path: imagePath, 
                        caption: `🎨 Generated: "${prompt}" | ජනනය කළා: "${prompt}"` 
                    };
                } else {
                    return "❌ දැනට image generate කරන්න බැහැ. Hugging Face models loading වෙනවා. 2-3 minutes wait කරලා නැවත try කරන්න.\n\nSorry, couldn't generate image right now. The AI models are loading. Please wait 2-3 minutes and try again.\n\n💡 Tip: Try simpler prompts like 'cat', 'sunset', 'car'";
                }
            } catch (error) {
                console.error('Error in image generation:', error);
                return "❌ Image generation error occurred. Models might be loading. Please try again in a few minutes.\nදැනට technical issue එකක් තියෙනවා. මිනිත්තු කිහිපයකින් නැවත try කරන්න.";
            }
        }

        // Detect language and check if it's code-related
        const userLanguage = detectLanguage(userMessage);
        const isCode = isCodeMessage(userMessage);
        
        // Get conversation context
        const memoryContext = getMemoryContext(chatId);
        
        const contextInfo = isGroup ? `(responding in group: ${groupName})` : '(private chat)';
        
        // Create language-aware prompt
        let languageInstruction = '';
        if (isCode) {
            languageInstruction = 'Always respond in English for code-related questions and technical topics.';
        } else if (userLanguage === 'sinhala') {
            languageInstruction = 'Respond primarily in Sinhala (සිංහල) with some English mixed in naturally. Use Sinhala Unicode characters properly.';
        } else if (userLanguage === 'mixed') {
            languageInstruction = 'Respond in both Sinhala and English mixed naturally, matching the user\'s language pattern.';
        } else {
            languageInstruction = 'Respond primarily in English, but you can use some Sinhala words naturally if appropriate.';
        }
        
        const prompt = `You are Neural AI ${contextInfo}, an advanced bilingual AI assistant that speaks both English and Sinhala fluently. ${languageInstruction}
        
        ${isGroup ? 'Keep responses concise since this is a group chat.' : 'You can provide detailed responses in private chats.'}
        
        Be helpful, friendly, and conversational. You have memory of previous conversations in this chat.
        
        Available commands:
        - "/clear" or "clear chat" - Clear conversation memory
        - "/generate image [description]" - Generate AI images
        - Send PDF files for reading and analysis
        
        Current message: ${userMessage}${memoryContext}`;

        const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.8,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: isGroup ? 512 : 1024,
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.data && response.data.candidates && response.data.candidates[0]) {
            const aiResponse = response.data.candidates[0].content.parts[0].text;
            
            // Add to memory
            addToMemory(chatId, userMessage, aiResponse);
            
            return aiResponse;
        } else {
            return "❌ දැනට ඔබේ message එක process කරන්න බැහැ. කරුණාකර නැවත උත්සාහ කරන්න.\nSorry, I couldn't process your message right now. Please try again.";
        }
    } catch (error) {
        console.error('Error calling AI:', error.response?.data || error.message);
        return "🔧 දැනට මගේ AI brain එකට connect වෙන්න අමාරුයි. මොහොතකින් නැවත උත්සාහ කරන්න.\nI'm having trouble connecting to my AI brain right now. Please try again in a moment.";
    }
}

// Offline message handling functions
function addToOfflineQueue(fromId, message, isGroup = false) {
    if (!offlineMessageQueue.has(fromId)) {
        offlineMessageQueue.set(fromId, []);
    }
    
    const queue = offlineMessageQueue.get(fromId);
    queue.push({
        message: message,
        timestamp: new Date(),
        isGroup: isGroup
    });
    
    console.log(`📥 Added message to offline queue for ${fromId}`);
}

async function processOfflineMessages() {
    if (offlineMessageQueue.size === 0) return;
    
    console.log(`📤 Processing ${offlineMessageQueue.size} offline message queues...`);
    
    for (const [fromId, messages] of offlineMessageQueue) {
        if (messages.length > 0) {
            const offlineResponse = messages.length === 1 
                ? "🔄 මම offline හිටියා. ඔබේ message එක දැන් process කරනවා!\nI was offline. Processing your message now!"
                : `🔄 මම offline හිටියා. ඔබේ messages ${messages.length}ක් process කරනවා!\nI was offline. Processing your ${messages.length} messages now!`;
            
            try {
                await client.sendMessage(fromId, offlineResponse);
                
                // Process the last message only to avoid spam
                const lastMessage = messages[messages.length - 1];
                const aiResponse = await getAIResponse(
                    lastMessage.message.body || 'Hello', 
                    fromId, 
                    lastMessage.isGroup
                );
                
                if (typeof aiResponse === 'object' && aiResponse.type === 'image') {
                    const media = MessageMedia.fromFilePath(aiResponse.path);
                    await client.sendMessage(fromId, media, { caption: aiResponse.caption });
                    if (fs.existsSync(aiResponse.path)) {
                        fs.unlinkSync(aiResponse.path);
                    }
                } else {
                    await client.sendMessage(fromId, aiResponse);
                }
                
            } catch (error) {
                console.error(`Error processing offline messages for ${fromId}:`, error);
            }
        }
    }
    
    // Clear the queue after processing
    offlineMessageQueue.clear();
    console.log('✅ Offline message queue processed and cleared');
}

// Permission functions
function isUserAllowed(userNumber) {
    return allowedUsers.has(userNumber);
}

function isGroupAllowed(groupId) {
    return allowedGroups.has(groupId);
}

function addAllowedUser(userNumber) {
    allowedUsers.add(userNumber);
    console.log(`✅ Added user to allowed list: ${userNumber}`);
}

function addAllowedGroup(groupId) {
    allowedGroups.add(groupId);
    console.log(`✅ Added group to allowed list: ${groupId}`);
}

function autoApprovePermissions(fromId, isGroup = false) {
    if (isGroup) {
        if (!isGroupAllowed(fromId)) {
            addAllowedGroup(fromId);
            return true;
        }
    } else {
        const userNumber = fromId.replace('@c.us', '');
        if (!isUserAllowed(userNumber)) {
            addAllowedUser(userNumber);
            return true;
        }
    }
    return false;
}

// Handle incoming messages
client.on('message_create', async (message) => {
    // Skip status broadcasts
    if (message.from === 'status@broadcast') return;
    
    // Handle outgoing messages (from the bot account)
    if (message.fromMe) {
        if (!message.to.includes('@g.us')) {
            const recipientNumber = message.to.replace('@c.us', '');
            addAllowedUser(recipientNumber);
        }
        return;
    }

    const isGroupMessage = message.from.includes('@g.us');
    
    // Check if bot is offline and handle accordingly
    if (!botStatus.isOnline || !botStatus.isInitialized) {
        // Add to offline queue instead of responding immediately
        if (isGroupMessage) {
            if (isGroupAllowed(message.from)) {
                addToOfflineQueue(message.from, message, true);
            }
        } else {
            const senderNumber = message.from.replace('@c.us', '');
            if (isUserAllowed(senderNumber)) {
                // Check if user is spamming while offline
                if (isUserSpamming(message.from)) {
                    // Send rate limit message only once
                    if (!offlineMessageQueue.has(message.from)) {
                        try {
                            await client.sendMessage(message.from, 
                                "⏳ මම දැනට offline. ඔබ messages ගොඩක් send කරනවා. කරුණාකර traffic එක අඩු වෙනකන් ඉන්න, මම online වුනාම reply දෙනවා.\n\n" +
                                "I'm currently offline. You're sending too many messages. Please wait until the traffic reduces, I'll reply when I'm back online."
                            );
                        } catch (error) {
                            console.error('Error sending rate limit message:', error);
                        }
                    }
                    return;
                }
                addToOfflineQueue(message.from, message, false);
            }
        }
        return;
    }

    if (isGroupMessage) {
        // Handle group messages
        const groupId = message.from;
        
        const wasNewGroup = autoApprovePermissions(groupId, true);
        
        if (!isGroupAllowed(groupId)) {
            console.log(`❌ Ignoring message from non-allowed group: ${groupId}`);
            return;
        }
        
        if (wasNewGroup) {
            await client.sendMessage(groupId, 
                "🤖 හෙලෝ! මම Neural AI, ඔබේ නව AI assistant!\n" +
                "Hello! I'm Neural AI, your new AI assistant!\n\n" +
                "💬 මට කරන්න පුළුවන්:\n" +
                "🧠 Smart conversations with memory\n" +
                "🎨 Image generation\n" +
                "📄 PDF reading\n" +
                "🗣️ Sinhala & English support\n\n" +
                "Commands: '/clear', '/generate image [description]'"
            );
        }
        
        let groupName = 'Unknown Group';
        try {
            const chat = await message.getChat();
            groupName = chat.name || 'Unknown Group';
        } catch (error) {
            console.error('Error getting group info:', error);
        }
        
        if (!message.body || message.body.trim() === '') {
            if (message.hasMedia) {
                try {
                    const media = await message.downloadMedia();
                    if (media.mimetype === 'application/pdf') {
                        const pdfText = await readPDF(media.data);
                        await client.sendMessage(message.from, 
                            `📄 PDF Content Summary:\n\n${pdfText.substring(0, 500)}...`
                        );
                    }
                } catch (error) {
                    console.error('Error handling media:', error);
                }
            }
            return;
        }
        
        console.log(`📨 Group message in ${groupName}: ${message.body.substring(0, 50)}...`);
        
        try {
            await message.getChat().then(chat => chat.sendStateTyping());
            
            const aiResponse = await getAIResponse(message.body, groupId, true, groupName);
            
            if (typeof aiResponse === 'object' && aiResponse.type === 'image') {
                const media = MessageMedia.fromFilePath(aiResponse.path);
                await client.sendMessage(message.from, media, { caption: aiResponse.caption });
                if (fs.existsSync(aiResponse.path)) {
                    fs.unlinkSync(aiResponse.path);
                }
            } else {
                await client.sendMessage(message.from, aiResponse);
            }
            
            console.log(`✅ Sent AI response to group ${groupName}`);
            
        } catch (error) {
            console.error('❌ Error processing group message:', error);
            await client.sendMessage(message.from, 
                "⚠️ Sorry, I encountered an error. / මට error එකක් ආවා.");
        }
        
    } else {
        // Handle direct messages
        const senderNumber = message.from.replace('@c.us', '');
        
        const wasNewUser = autoApprovePermissions(message.from, false);
        
        if (!isUserAllowed(senderNumber)) {
            console.log(`❌ Ignoring message from non-allowed user: ${senderNumber}`);
            return;
        }
        
        if (wasNewUser) {
            await client.sendMessage(message.from, 
                "👋 හෙලෝ! මම Neural AI, ඔබේ personal AI assistant!\n" +
                "Hello! I'm Neural AI, your personal AI assistant!\n\n" +
                "🎯 මට ඔබට help කරන්න පුළුවන්:\n" +
                "💭 Intelligent conversations (Sinhala & English)\n" +
                "🎨 Image generation\n" +
                "📄 PDF document analysis\n" +
                "🧠 Conversation memory\n\n" +
                "Commands:\n" +
                "• '/clear' - Reset conversation\n" +
                "• '/generate image [description]' - Create images\n\n" +
                "ඔබට අද මම කොහොමද help කරන්නේ?\nHow can I help you today?"
            );
        }
        
        if (!message.body || message.body.trim() === '') {
            if (message.hasMedia) {
                try {
                    const media = await message.downloadMedia();
                    if (media.mimetype === 'application/pdf') {
                        const pdfText = await readPDF(media.data);
                        await client.sendMessage(message.from, 
                            `📄 මම ඔබේ PDF එක analyze කළා:\nI've analyzed your PDF:\n\n${pdfText.substring(0, 800)}...`
                        );
                    }
                } catch (error) {
                    console.error('Error handling media:', error);
                }
            }
            return;
        }

        console.log(`📨 Direct message from ${senderNumber}: ${message.body.substring(0, 50)}...`);

        try {
            await message.getChat().then(chat => chat.sendStateTyping());
            
            const aiResponse = await getAIResponse(message.body, message.from, false);
            
            if (typeof aiResponse === 'object' && aiResponse.type === 'image') {
                const media = MessageMedia.fromFilePath(aiResponse.path);
                await client.sendMessage(message.from, media, { caption: aiResponse.caption });
                if (fs.existsSync(aiResponse.path)) {
                    fs.unlinkSync(aiResponse.path);
                }
            } else {
                await client.sendMessage(message.from, aiResponse);
            }
            
            console.log(`✅ Sent AI response to ${senderNumber}`);
            
        } catch (error) {
            console.error('❌ Error processing direct message:', error);
            await client.sendMessage(message.from, 
                "⚠️ Sorry, I encountered an error. / මට error එකක් ආවා.");
        }
    }
});

// Initialize client
console.log('🚀 Starting Neural AI initialization...');

client.initialize().catch(error => {
    console.error('❌ Failed to initialize client:', error);
    botStatus.isOnline = false;
    process.exit(1);
});

// Status monitoring
setInterval(() => {
    if (botStatus.isOnline) {
        botStatus.lastSeen = new Date();
    }
}, 30000); // Update every 30 seconds

// Initialization timeout
setTimeout(() => {
    if (!botStatus.isInitialized) {
        console.log('💡 Troubleshooting tips:');
        console.log('1. 🗑️  Delete the wwebjs_auth folder');
        console.log('2. 🔄 Restart the bot');
        console.log('3. 📦 Check all dependencies are installed');
        console.log('4. 🔑 Make sure API keys are configured');
        console.log('5. 🌐 Check internet connection');
    }
}, 30000);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down Neural AI...');
    botStatus.isOnline = false;
    await client.destroy();
    
    // Clean up temp files
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
        try {
            const files = fs.readdirSync(tempDir);
            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                fs.unlinkSync(filePath);
            });
            fs.rmdirSync(tempDir);
            console.log('🧹 Cleaned up temporary files');
        } catch (error) {
            console.error('Error cleaning up temp files:', error);
        }
    }
    
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    botStatus.isOnline = false;
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    botStatus.isOnline = false;
});

// Clean up old temp files on startup
function cleanupTempFiles() {
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
        try {
            const files = fs.readdirSync(tempDir);
            const now = Date.now();
            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                const fileAge = now - stats.mtime.getTime();
                
                // Delete files older than 1 hour
                if (fileAge > 3600000) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Deleted old temp file: ${file}`);
                }
            });
        } catch (error) {
            console.error('Error cleaning up old temp files:', error);
        }
    }
}

// Run cleanup on startup
cleanupTempFiles();

// Schedule periodic cleanup every hour
setInterval(cleanupTempFiles, 3600000);

// Export for use in other modules
module.exports = {
    client,
    addAllowedUser,
    isUserAllowed,
    addAllowedGroup,
    isGroupAllowed,
    clearChatMemory,
    getChatMemory,
    botStatus,
    generateImage
};
