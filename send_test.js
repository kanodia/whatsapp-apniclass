const axios = require("axios");
require("dotenv").config();

const { GRAPH_API_TOKEN } = process.env;

// Values extracted from your previous logs
const PHONE_NUMBER_ID = "849439781595165";
const TO_PHONE_NUMBER = "917745058833";

async function sendTest() {
    console.log("Attempting to send test message...");
    try {
        const response = await axios({
            method: "POST",
            url: `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
            headers: {
                Authorization: `Bearer ${GRAPH_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            data: {
                messaging_product: "whatsapp",
                to: TO_PHONE_NUMBER,
                type: "template",
                template: {
                    name: "hello_world",
                    language: {
                        code: "en_US",
                    },
                },
            },
        });
        console.log("SUCCESS! Message sent.");
        console.log("Response data:", response.data);
    } catch (error) {
        console.error("FAILED to send message.");
        console.error("Error details:", error.response ? error.response.data : error.message);
    }
}

sendTest();
