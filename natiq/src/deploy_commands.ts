import { GatewayIntentBits } from "discord.js";
import AyahBotClient from "@/classes/AyahBotClient.js";
import { register_commands } from "@/utils/register_commands.js";
import logger from "@/utils/logger.js";

const client = new AyahBotClient({
  intents: [GatewayIntentBits.Guilds],
});

try {
  await client.load_commands();
  await register_commands(client);
  logger.info("Done.");
  process.exit(0);
} catch (error) {
  logger.error({ error }, "Command deployment failed");
  process.exit(1);
}
