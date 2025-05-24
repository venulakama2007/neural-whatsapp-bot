require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

console.log('🚀 Neural AI WhatsApp Bot Setup');
console.log('================================');

// Check if all required directories exist
function checkDirectories() {
    console.log('📁 Checking directories...');

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log('✅ Created temp directory');
    } else {
        console.log('✅ Temp directory exists');
    }

    const authDir = path.join(__dirname, 'wwebjs_auth');
    if (fs.existsSync(authDir)) {
        console.log('📱 WhatsApp auth data exists');
    } else {
        console.log('📱 WhatsApp auth will be created on first run');
    }
}

// Test API connections
async function testAPIs() {
    console.log('\n🧪 Testing API connections...');

    // Test Gemini API
    try {
        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{ text: "Hello, respond with 'API test successful'" }]
                }]
            },
            { timeout: 10000 }
        );

        if (geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.log('✅ Gemini AI API: Working');
        } else {
            console.log('⚠️ Gemini AI API: Unexpected response');
        }
    } catch (error) {
        console.log('❌ Gemini AI API: Failed -', error.response?.status || error.message);
    }

    // Test Hugging Face API with multiple models
    const models = [
        'runwayml/stable-diffusion-v1-5',
        'stabilityai/stable-diffusion-2-1',
        'CompVis/stable-diffusion-v1-4'
    ];

    console.log('\n🎨 Testing Image Generation Models:');

    for (const model of models) {
        try {
            const response = await axios.post(
                `https://api-inference.huggingface.co/models/${model}`,
                { inputs: "test" },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            const status = response.status;
            if (status === 200) {
                console.log(`✅ ${model}: Working`);
            } else if (status === 503) {
                console.log(`⏳ ${model}: Loading (will work after few minutes)`);
            } else {
                console.log(`⚠️ ${model}: Status ${status}`);
            }
        } catch (error) {
            const status = error.response?.status;
            const message = error.response?.statusText || error.message;

            if (status === 503) {
                console.log(`⏳ ${model}: Model Loading (normal for first use)`);
            } else if (status === 401) {
                console.log(`❌ ${model}: API Key Invalid`);
            } else if (status === 404) {
                console.log(`❌ ${model}: Model Not Found`);
            } else {
                console.log(`❌ ${model}: ${status || 'Network Error'} - ${message}`);
            }
        }
    }
}

// Display configuration info
function showConfig() {
    console.log('\n⚙️ Configuration:');
    console.log('📧 Gemini API: Loaded from .env');
    console.log('🎨 Hugging Face API: Loaded from .env');
    console.log('📱 WhatsApp: Will authenticate on first run');

    console.log('\n👥 Pre-configured Users:');
    const users = ['724070509', '767387335', '763979857', '768044107', '777234560'];
    users.forEach(user => console.log(`   • +94${user}`));

    console.log('\n💬 Pre-configured Groups:');
    console.log('   • 2 groups pre-configured');
    console.log('   • New groups will be auto-approved');
}

// Main setup function
async function runSetup() {
    try {
        checkDirectories();
        await testAPIs();
        showConfig();

        console.log('\n🎉 Setup Complete!');
        console.log('\n📝 Next Steps:');
        console.log('1. Run: npm start');
        console.log('2. Scan QR code with WhatsApp');
        console.log('3. Send test message to bot');
        console.log('4. Try image generation: "generate image cat"');

        console.log('\n💡 Tips:');
        console.log('• If image generation fails initially, wait 2–3 minutes for models to load');
        console.log('• Use simple prompts like "cat", "sunset", "car"');
        console.log('• Bot supports Sinhala + English');
        console.log('• Delete wwebjs_auth folder if you need to re-authenticate');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run setup
runSetup();
