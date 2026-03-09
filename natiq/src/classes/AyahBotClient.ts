import { Client, Collection, type ClientOptions } from "discord.js";
import { readdir } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import logger from "@/utils/logger.js";

export type AyahBotCommand = {
  data: { name: string };
  execute: (...args: any[]) => Promise<unknown> | unknown;
};

export type AyahBotEvent = {
  name: string;
  once?: boolean;
  execute: (client: AyahBotClient, ...args: any[]) => Promise<unknown> | unknown;
};

async function walk_dir(dir_path: string): Promise<string[]> {
  const entries = await readdir(dir_path, { withFileTypes: true });
  const file_paths: string[] = [];

  for (const entry of entries) {
    const entry_path = path.join(dir_path, entry.name);

    if (entry.isDirectory()) {
      file_paths.push(...(await walk_dir(entry_path)));
      continue;
    }

    if (!entry.isFile()) continue;

    if (
      entry.name.endsWith(".d.ts") ||
      (!entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".mts") &&
        !entry.name.endsWith(".cts"))
    ) {
      continue;
    }

    file_paths.push(entry_path);
  }

  return file_paths;
}

export default class AyahBotClient<
  Ready extends boolean = boolean,
> extends Client<Ready> {
  commands: Collection<string, AyahBotCommand>;

  constructor(options: ClientOptions) {
    super(options);
    this.commands = new Collection();
  }

  async load_commands(commands_dir?: string) {
    const log = logger.child({ loader: "commands" });
    const base_dir = path.dirname(fileURLToPath(import.meta.url));
    const resolved_dir =
      commands_dir ?? path.resolve(base_dir, "../commands");

    log.info({ commands_dir: resolved_dir }, "Loading commands");

    const command_files = await walk_dir(resolved_dir);

    let loaded_count = 0;
    let skipped_count = 0;

    for (const file_path of command_files) {
      try {
        const file_url = pathToFileURL(file_path);
        const imported = await import(file_url.href);
        const command: AyahBotCommand | undefined = imported?.default;

        if (!command?.data?.name || typeof command.execute !== "function") {
          skipped_count += 1;
          log.warn(
            { file_path },
            "Skipping command: missing default export, data.name, or execute()",
          );
          continue;
        }

        const command_name = command.data.name;
        if (this.commands.has(command_name)) {
          log.warn(
            { command_name, file_path },
            "Duplicate command name; overwriting previous",
          );
        }

        this.commands.set(command_name, command);
        loaded_count += 1;
      } catch (error) {
        skipped_count += 1;
        log.error({ file_path, error }, "Failed to load command");
      }
    }

    log.info(
      { loaded_count, skipped_count },
      "Commands loaded",
    );
  }

  async load_events(events_dir?: string) {
    const log = logger.child({ loader: "events" });
    const base_dir = path.dirname(fileURLToPath(import.meta.url));
    const resolved_dir = events_dir ?? path.resolve(base_dir, "../events");

    log.info({ events_dir: resolved_dir }, "Loading events");

    const event_files = await walk_dir(resolved_dir);

    let loaded_count = 0;
    let skipped_count = 0;

    for (const file_path of event_files) {
      try {
        const file_url = pathToFileURL(file_path);
        const imported = await import(file_url.href);
        const event: AyahBotEvent | undefined = imported?.default;

        if (!event?.name || typeof event.execute !== "function") {
          skipped_count += 1;
          log.warn(
            { file_path },
            "Skipping event: missing default export, name, or execute()",
          );
          continue;
        }

        const handler = (...args: any[]) => event.execute(this, ...args);
        if (event.once) {
          this.once(event.name as any, handler);
        } else {
          this.on(event.name as any, handler);
        }

        loaded_count += 1;
      } catch (error) {
        skipped_count += 1;
        log.error({ file_path, error }, "Failed to load event");
      }
    }

    log.info({ loaded_count, skipped_count }, "Events loaded");
  }
}
