import "dotenv/config";

import { PushAPI, CONSTANTS } from "@pushprotocol/restapi";
import { ethers } from "ethers";
import axios from "axios";
import { exec } from "child_process";


// ***************************************************************
// /////////////////// INITIALIZE USER ALICE /////////////////////
// ***************************************************************

const provider = new ethers.JsonRpcProvider(
  `${process.env.ETHEREUM_RPC_PROVIDER}`
);
const signer = new ethers.Wallet(`${process.env.PRIVATE_KEY}`, provider);
console.log("Signer: ", signer);

const userAlice = await PushAPI.initialize(signer, {
  env: CONSTANTS.ENV.PROD,
});

if (userAlice.errors.length > 0) {
  restartServer();
}


const stream = await userAlice.initStream(
  [
    CONSTANTS.STREAM.CHAT, // Listen for chat messages
    CONSTANTS.STREAM.NOTIF, // Listen for notifications
    CONSTANTS.STREAM.CONNECT, // Listen for connection events
    CONSTANTS.STREAM.DISCONNECT, // Listen for disconnection events
  ],
  {
    filter: {
      channels: ["*"],
      chats: ["*"],
    },
    // Connection options:
    connection: {
      retries: 3, // Retry connection 3 times if it fails
    },
    raw: false, // Receive events in structured format
  }
);

// ***************************************************************
// /////////////////// SETUP EVENT LISTENERS /////////////////////
// ***************************************************************

// Stream connection established:
stream.on(CONSTANTS.STREAM.CONNECT, async (a) => {
  console.log("Stream Connected");

  // Send initial message to PushAI Bot:
  console.log("Sending message to Bot");
});

// Chat message received:
stream.on(CONSTANTS.STREAM.CHAT, async (message) => {
  try {
    console.log("Encrypted Message Received");

    if (message.event == "chat.request") {
      await userAlice.chat.accept(message.from);
    }

    if (message.origin === "self") {
      console.log("Ignoring the message...");
      return;
    }

    if (!message.message.content) {
      throw {
        message:
          "Couldn't read the last message💥.\n Try again after some time!",
      };
    }

    const params = message.message.content;
    
    if (params) {
      console.log(params);
      const response = "Demo response";
      console.log(response);
      throw {
        message: response.answer,
      };
    }
  } catch (error) {
    await userAlice.chat.send(message.from, {
      type: "Text",
      content: `${
        error.message
          ? error.message
          : "Something went wrong. Try again after some time!"
      }`,
    });
  }
});

// Chat operation received:
stream.on(CONSTANTS.STREAM.CHAT_OPS, (data) => {
  console.log("Chat operation received.");
});

// Stream disconnection:
stream.on(CONSTANTS.STREAM.DISCONNECT, async () => {
  console.log("Stream Disconnected");
  restartServer();

});

// ***************************************************************
// //////////////////// CONNECT THE STREAM ///////////////////////
// ***************************************************************

await stream.connect(); 


// restart server function

function restartServer() {
  const pm2ProcessNumber = process.env.PM2_PROCESS_NUMBER;
  exec(`pm2 restart ${pm2ProcessNumber}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error restarting server: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr while restarting server: ${stderr}`);
      return;
    }
    console.log(`Server restarted successfully: ${stdout}`);
  });
}