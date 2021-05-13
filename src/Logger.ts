const INFO_COLOR = "#93C5FD";
const ERROR_COLOR = "#FCA5A5";
const WARN_COLOR = "#FCD34D";
const NULL_COLOR = "#D1D5DB";

const tag = (text: string, bgColor: string, color: string = "black") => {
  if (typeof window !== "undefined") {
    return [
      `%c${text}`,
      `background-color: ${bgColor}; padding: 4px; color: ${color}; font-weight: bold; border-radius: 4px;`,
    ];
  }
  return [text];
};

class Logger {
  private isInGroup: boolean = false;
  private pluginName: string = "Plugin Sync";

  startGroup(groupName: string) {
    console.group(...tag(`${this.pluginName}: ${groupName}`, NULL_COLOR));
    this.isInGroup = true;
  }

  endGroup() {
    this.isInGroup = false;
    console.groupEnd();
  }

  debug(...args: any[]) {
    const text = this.isInGroup ? "DEBUG" : this.pluginName;
    console.info(...tag(text, NULL_COLOR), ...args);
  }

  info(...args: any[]) {
    const text = this.isInGroup ? "INFO" : this.pluginName;
    console.info(...tag(text, INFO_COLOR), ...args);
  }

  warn(...args: any[]) {
    const text = this.isInGroup ? "WARN" : this.pluginName;
    console.warn(...tag(text, WARN_COLOR), ...args);
  }

  error(...args: any[]) {
    const text = this.isInGroup ? "ERROR" : this.pluginName;
    console.error(...tag(text, ERROR_COLOR), ...args);
  }

  table(...args: any[]) {
    console.table(...args);
  }

  // --- new functions

  start() {}

  end() {}
}

export const log = new Logger();
