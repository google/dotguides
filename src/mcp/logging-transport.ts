import type {
  Transport,
  TransportSendOptions,
} from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  JSONRPCMessage,
  MessageExtraInfo,
} from "@modelcontextprotocol/sdk/types.js";
import { appendFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

/**
 * A transport wrapper that logs all incoming and outgoing messages to a temporary file.
 */
export class LoggingTransport implements Transport {
  // These are the properties of the Transport interface.
  // We will delegate them to the wrapped transport.
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
  sessionId?: string;

  private wrapped: Transport;
  private logFile: string;

  constructor(wrapped: Transport) {
    this.wrapped = wrapped;
    this.logFile = join(tmpdir(), `dotguides-mcp-${Date.now()}.log`);

    // We need to intercept the onmessage handler.
    // The Server will set onmessage on *this* instance.
    // We will set the onmessage on the *wrapped* instance to our logger.
    this.wrapped.onmessage = (message, extra) => {
      this.log("RECV", message);
      // When a message is received, call the handler that the Server set on us.
      if (this.onmessage) {
        this.onmessage(message, extra);
      }
    };

    // For other properties, we need to proxy them.
    // We can't use getters and setters due to exactOptionalPropertyTypes.
    // So we will define them on the prototype.
    Object.defineProperties(this, {
      onclose: {
        get: () => this.wrapped.onclose,
        set: (v) => (this.wrapped.onclose = v),
        enumerable: true,
      },
      onerror: {
        get: () => this.wrapped.onerror,
        set: (v) => (this.wrapped.onerror = v),
        enumerable: true,
      },
      sessionId: {
        get: () => this.wrapped.sessionId,
        set: (v) => (this.wrapped.sessionId = v),
        enumerable: true,
      },
    });
  }

  private async log(direction: "SEND" | "RECV" | "SYSTEM", data: any) {
    try {
      const logEntry = `[${new Date().toISOString()}] ${direction}: ${JSON.stringify(
        data,
        null,
        2
      )}\n\n`;
      await appendFile(this.logFile, logEntry);
    } catch (e) {
      console.error(`Failed to write to log file ${this.logFile}`, e);
    }
  }

  async start(): Promise<void> {
    await this.log("SYSTEM", `Log file started at ${this.logFile}`);
    return this.wrapped.start();
  }

  async send(
    message: JSONRPCMessage,
    options?: TransportSendOptions
  ): Promise<void> {
    this.log("SEND", message);
    return this.wrapped.send(message, options);
  }

  async close(): Promise<void> {
    return this.wrapped.close();
  }

  setProtocolVersion(version: string): void {
    if (this.wrapped.setProtocolVersion) {
      this.wrapped.setProtocolVersion(version);
    }
  }
}
