const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;

app.listen(PORT || 3000, () => {
  console.log(`Server is listening on port ${PORT || 3000}`);
});

// Verification Endpoint
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Message Handling Endpoint
app.post("/webhook", async (req, res) => {
  console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));

  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const phone_number_id =
        body.entry[0].changes[0].value.metadata.phone_number_id;
      const from = body.entry[0].changes[0].value.messages[0].from;
      const msg_body = body.entry[0].changes[0].value.messages[0].text.body;

      console.log(`Phone number ID: ${phone_number_id}`);
      console.log(`From: ${from}`);
      console.log(`Message body: ${msg_body}`);

      // Send Interactive Button Message
      try {
        await axios({
          method: "POST",
          url: `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
          headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          data: {
            messaging_product: "whatsapp",
            to: from,
            type: "interactive",
            interactive: {
              type: "button",
              body: {
                text: "Welcome to ApniClass! How can we help you today?",
              },
              action: {
                buttons: [
                  {
                    type: "reply",
                    reply: {
                      id: "cambridge_coaching",
                      title: "Cambridge Coaching",
                    },
                  },
                  {
                    type: "reply",
                    reply: {
                      id: "ib_coaching",
                      title: "IB Board Coaching",
                    },
                  },
                  {
                    type: "reply",
                    reply: {
                      id: "test_series",
                      title: "Test Series",
                    },
                  },
                ],
              },
            },
          },
        });
        console.log("Reply sent successfully!");
      } catch (error) {
        console.error("Error sending message:", error?.response?.data || error.message);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});
