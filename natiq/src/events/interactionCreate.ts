import type AyahBotClient from "@/classes/AyahBotClient.js";
import logger from "@/utils/logger.js";
import { Events, MessageFlags, type Interaction } from "discord.js";
import { randomBytes } from "node:crypto";

const interactionCreateEvent = {
  name: Events.InteractionCreate,
  async execute(client: AyahBotClient, interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const traceId = randomBytes(4).toString("hex");
    const log = logger.child({
      traceId,
      guildId: interaction.guildId,
      user: interaction.user.tag,
      command: interaction.commandName,
    });

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      log.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction, log, client);
    } catch (error) {
      log.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};

export default interactionCreateEvent;
