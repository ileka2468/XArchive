// ipc.ts

export type IPCType = "action" | "activity" | "error";

export interface IPCMessage {
  ipc_type: IPCType;
  msg: string;
  credentials?: {
    username: string;
    email: string;
    password: string;
  };
  backup_name?: string;
}
