const express = require("express");
const { sendMessage } = require("./utils");
require("dotenv").config();

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, PORT, GRAPH_API_TOKEN, PHONE_NUMBER_ID } = process.env;

// 1. Validate required environment variables
if (!GRAPH_API_TOKEN || !PHONE_NUMBER_ID || !WEBHOOK_VERIFY_TOKEN) {
  console.error("❌ Missing required environment variables!");
  console.error("Required: GRAPH_API_TOKEN, PHONE_NUMBER_ID, WEBHOOK_VERIFY_TOKEN");
  process.exit(1);
}

// 2. Store processed message IDs to prevent duplicates
const processedMessages = new Set();
const MESSAGE_CACHE_SIZE = 1000;

app.listen(PORT || 3000, () => {
  console.log(`🚀 Server is listening on port ${PORT || 3000}`);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Verification Endpoint
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
      console.log("✅ WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      console.log("❌ Webhook verification failed");
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Main Message Handler
app.post("/webhook", async (req, res) => {
  const body = req.body;

  // 3. Stricter Object Validation
  if (!body.object || body.object !== "whatsapp_business_account") {
    return res.sendStatus(404);
  }

  // 4. Always respond with 200 immediately to prevent retries
  res.sendStatus(200);

  // 5. Process entries asynchronously
  if (!body.entry || !Array.isArray(body.entry)) {
    return;
  }

  for (const entry of body.entry) {
    if (!entry.changes || !Array.isArray(entry.changes)) continue;

    for (const change of entry.changes) {
      const value = change.value;

      // Ignore status updates
      if (value.statuses) continue;

      if (value.messages && value.messages.length > 0) {
        const msg = value.messages[0];
        const from = msg.from;
        const messageId = msg.id;

        // 6. Check for duplicate messages
        if (processedMessages.has(messageId)) {
          console.log(`⏭️  Skipping duplicate message: ${messageId}`);
          continue;
        }

        // Add to processed set
        processedMessages.add(messageId);

        // Prevent memory leak by limiting cache size
        if (processedMessages.size > MESSAGE_CACHE_SIZE) {
          const firstItem = processedMessages.values().next().value;
          processedMessages.delete(firstItem);
        }

        try {
          console.log(`📩 Received ${msg.type} from ${from}`);

          // Scenario A: User sent Text (e.g., "Hi") -> Send Welcome Buttons
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
            const replyId = msg.interactive?.button_reply?.id;
            const replyTitle = msg.interactive?.button_reply?.title;

            if (!replyId || !replyTitle) {
              console.log("⚠️  Invalid interactive message structure");
              continue;
            }

            console.log(`🔘 User clicked: ${replyTitle} (${replyId})`);

            let responseText = `You selected ${replyTitle}.`;

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
          } else {
            console.log(`ℹ️  Unsupported message type: ${msg.type}`);
          }
        } catch (error) {
          console.error(`❌ Error processing message ${messageId}:`, error.message);
        }
      }
    }
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});
