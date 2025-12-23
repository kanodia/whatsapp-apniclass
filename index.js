const express = require("express");
const { sendMessage } = require("./utils");
require("dotenv").config();

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, PORT } = process.env;

app.listen(PORT || 3000, () => {
  console.log(`🚀 Server is listening on port ${PORT || 3000}`);
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

// Main Message Handler
app.post("/webhook", async (req, res) => {
  const body = req.body;

  // 1. Validate it's a WhatsApp Event
  if (!body.object) return res.sendStatus(404);

  // 2. Iterate over entries
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const value = change.value;

      // 3. IGNORE STATUS UPDATES (Sent, Delivered, Read)
      if (value.statuses) {
        // console.log("-> Status update ignored.");
        continue;
      }

      // 4. HANDLE MESSAGES
      if (value.messages && value.messages.length > 0) {
        const msg = value.messages[0];
        const from = msg.from;

        console.log(`📩 Received ${msg.type} from ${from}`);

        // Scenerio A: User sent Text (e.g., "Hi") -> Send Welcome Buttons
        if (msg.type === "text") {
          await sendMessage(from, {
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
                    reply: { id: "cambridge_coaching", title: "Cambridge" },
                  },
                  {
                    type: "reply",
                    reply: { id: "ib_coaching", title: "IB Board" },
                  },
                  {
                    type: "reply",
                    reply: { id: "test_series", title: "Test Series" },
                  },
                ],
              },
            },
          });
        }

        // Scenario B: User clicked a Button
        else if (msg.type === "interactive") {
          const replyId = msg.interactive.button_reply.id;
          const replyTitle = msg.interactive.button_reply.title;

          console.log(`🔘 User clicked: ${replyTitle} (${replyId})`);

          let responseText = `You selected ${replyTitle}.`;

          // Custom logic based on selection
          if (replyId === "cambridge_coaching") {
            responseText = "Excellent choice! Our Cambridge coaching connects you with top tutors. One moment please...";
          } else if (replyId === "ib_coaching") {
            responseText = "IB Board is tough, but we make it easy. Starting a chat with an advisor...";
          } else if (replyId === "test_series") {
            responseText = "Sharpen your skills! Here is the link to our latest mock tests: [Link]";
          }

          await sendMessage(from, {
            type: "text",
            text: { body: responseText },
          });
        }
      }
    }
  }

  res.sendStatus(200);
});
