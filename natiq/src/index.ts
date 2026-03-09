import { GatewayIntentBits } from "discord.js";
import env from "@/utils/config.js";
import AyahBotClient from "./classes/AyahBotClient.js";

const client = new AyahBotClient({
  intents: [GatewayIntentBits.Guilds],
});

await client.load_events();
await client.load_commands();

client.login(env.discord.token);
