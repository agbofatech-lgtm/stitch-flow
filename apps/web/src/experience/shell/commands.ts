export type CommandEntry = {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  onSelect: () => void;
};

export function filterCommands(commands: CommandEntry[], query: string): CommandEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;
  return commands.filter((command) =>
    `${command.group} ${command.label} ${command.keywords || ''}`.toLowerCase().includes(needle)
  );
}

export function groupCommands(commands: CommandEntry[]): Array<{ group: string; items: CommandEntry[] }> {
  const order: string[] = [];
  const buckets = new Map<string, CommandEntry[]>();
  for (const command of commands) {
    if (!buckets.has(command.group)) {
      buckets.set(command.group, []);
      order.push(command.group);
    }
    buckets.get(command.group)!.push(command);
  }
  return order.map((group) => ({ group, items: buckets.get(group)! }));
}
