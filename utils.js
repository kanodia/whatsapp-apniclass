const axios = require("axios");
require("dotenv").config();

const { GRAPH_API_TOKEN, PHONE_NUMBER_ID } = process.env;

async function sendMessage(to, payload) {
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
                to: to,
                ...payload,
            },
        });
        console.log(`✅ Message sent to ${to}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error sending message to ${to}:`, error?.response?.data || error.message);
        // Don't throw, just log. We don't want to crash the server.
        return null;
    }
}

module.exports = {
    sendMessage,
};
