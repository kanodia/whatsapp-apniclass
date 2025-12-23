const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;

// RAW BODY BUFFER LOGGER
// This will capture the raw data before any parsing happens
app.use((req, res, next) => {
  let data = "";
  req.setEncoding("utf8");
  req.on("data", function (chunk) {
    data += chunk;
  });
  req.on("end", function () {
    req.rawBody = data;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log("Headers:", JSON.stringify(req.headers));
    console.log("RAW BODY:", data);
    next();
  });
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
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

app.post("/webhook", async (req, res) => {
  // We already logged the body above.
  // Just send 200 to keep Facebook happy.
  res.sendStatus(200);

  // Try to parse manually to see if it works
  try {
    const body = JSON.parse(req.rawBody);
    console.log("Parsed JSON successfully!");

    // Simple auto-reply logic (if parsing worked)
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      const msg = body.entry[0].changes[0].value.messages[0];
      console.log("RECEIVED MESSAGE FROM:", msg.from);

      // Reply
      await axios({
        method: "POST",
        url: `https://graph.facebook.com/v21.0/${body.entry[0].changes[0].value.metadata.phone_number_id}/messages`,
        headers: {
          Authorization: `Bearer ${GRAPH_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        data: {
          messaging_product: "whatsapp",
          to: msg.from,
          type: "text",
          text: { body: "I received your message!" }
        },
      });
      console.log("Replied!");
    }
  } catch (e) {
    console.error("Could not parse JSON body:", e.message);
  }
});
