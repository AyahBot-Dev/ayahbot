import { REST, Routes } from "discord.js";
import type AyahBotClient from "@/classes/AyahBotClient.js";
import logger from "@/utils/logger.js";
import config from "@/utils/config.js";

type RegisterCommandsOptions = {
  guildId?: string;
};

export async function register_commands(
  client: AyahBotClient,
  options: RegisterCommandsOptions = {},
) {
  const log = logger.child({ feature: "register_commands" });

  const token = config.discord.token;
  const clientId = config.discord.clientId;
  const guildId = options.guildId ?? config.discord.serverId;

  const commandsJson = [...client.commands.values()]
    .map((command) => {
      const data: any = command?.data;
      if (typeof data?.toJSON === "function") return data.toJSON();
      return data;
    })
    .filter(Boolean);

  log.info(
    { commands_count: commandsJson.length, guildId },
    "Registering application commands",
  );

  const rest = new REST().setToken(token);

  try {
    const route = Routes.applicationGuildCommands(clientId, guildId);

    await rest.put(route, {
      body: commandsJson,
    });

    log.info(
      { commands_count: commandsJson.length, guildId },
      "Application commands registered",
    );
  } catch (error) {
    log.error({ error, guildId }, "Failed to register application commands");
    throw error;
  }
}
