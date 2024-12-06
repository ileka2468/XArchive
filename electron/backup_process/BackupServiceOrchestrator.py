import asyncio
import json
import socket
import threading
import multiprocessing
from multiprocessing import Process
import os
import sys

from TwitterBackupService import TwitterBackupService

DEFAULT_SYNC_RATE_SECS = 60

def run_backup_service(backup_name, credentials, event_queue, backup_dir):
    def event_callback(event_type, message):
        event_queue.put((event_type, message))
    backup_service = TwitterBackupService(
        backup_name, credentials, event_callback, backup_dir
    )
    asyncio.run(backup_service.start_backup())

class BackupServiceOrchestrator:
    def __init__(self):
        self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.backup_service_objects = {}  # {backup_name: (process, event_queue)}
        self.conn = None
        # load user settings or default settings
        self.settings = {
            "syncRate": sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SYNC_RATE_SECS,
            "backupDir": sys.argv[2] if len(sys.argv) > 2 else None
        }

        # absolute path to the electron directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        electron_dir = os.path.abspath(os.path.join(script_dir, ".."))
        self.metadata_file = os.path.join(electron_dir, "metadata.json")

        self.load_metadata()

    def load_metadata(self):
        if os.path.exists(self.metadata_file):
            with open(self.metadata_file, 'r') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {}

    def save_metadata(self):
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)
        # tell the main process about the update
        try:
            self.conn.sendall(f"metadata-updated:{json.dumps(self.metadata)}\n".encode())
        except Exception as e:
            print(f"Failed to send metadata-updated message: {e}")

    def init_ipc_socket(self):
        self.server.bind(('localhost', 12345))
        self.server.listen(1)
        print("Server listening on port 12345")
        while True:
            self.conn, addr = self.server.accept()
            print(f"Connection established with {addr}")
            threading.Thread(target=self.handle_client, args=(self.conn,)).start()

    def handle_client(self, conn):
        while True:
            try:
                msg = conn.recv(1024).decode()
                if not msg:
                    break
                self.process_message(msg, conn)
            except Exception as e:
                print(f"Error handling client message: {e}")
                break
        conn.close()
        print("Connection closed")

    def process_message(self, msg, conn):
        try:
            payload = json.loads(msg)
            self.execute_action(payload, conn)
        except json.JSONDecodeError:
            print("Invalid JSON received")
            conn.sendall(b"error:Invalid JSON\n")

    def execute_action(self, payload, conn):
        action = payload.get("ipc_type")
        if action == "action":
            msg = payload.get("msg")
            if msg == "startBackup":
                self.start_backup(payload, conn)
            elif msg == "stopBackup":
                self.stop_backup(payload, conn)
            elif msg == "deleteBackup":
                self.delete_backup(payload, conn)
            else:
                conn.sendall(f"error:Unknown action {msg}\n".encode())
        else:
            conn.sendall(b"error:Unknown ipc_type\n")

    def start_backup(self, payload, conn): # TODO change to create_backup and add a propper start_backup method that starts an existing backup
        try:
            credentials = payload.get("credentials", {})
            backup_name = payload.get("backup_name")
            if not backup_name:
                conn.sendall(b"error:Backup name is required\n")
                return

            backup_dir = os.path.join("backups", backup_name) #TODO inject user settings here for backup directory path
            if os.path.exists(backup_dir):
                conn.sendall(b"error:Backup name already exists\n")
                return
            os.makedirs(backup_dir, exist_ok=True)

            # Update the metadata
            self.metadata[backup_name] = {
                "backup_name": backup_name,
                "credentials": {
                    "username": credentials.get("username", ""),
                    "email": credentials.get("email", ""),
                    "password": credentials.get("password", "")
                },
                "status": "Running",
                "backup_dir": backup_dir
            }
            self.save_metadata()

            # Create event queue for inter-process communication
            event_queue = multiprocessing.Queue()

            # Create the backup process
            process = Process(
                target=run_backup_service,
                args=(backup_name, credentials, event_queue, backup_dir)
            )

            # Start the backup process
            process.start()

            # Store the process and event queue
            self.backup_service_objects[backup_name] = (process, event_queue)

            # Start a thread to listen to events from the backup service
            threading.Thread(
                target=self.listen_to_events,
                args=(backup_name, event_queue, conn),
                daemon=True
            ).start()

            # Send back the backup name
            conn.sendall(f"Backup started with name: {backup_name}\n".encode())
        except Exception as e:
            conn.sendall(f"error:Failed to start backup: {e}\n".encode())

    def stop_backup(self, payload, conn):
        backup_name = payload.get("backup_name")
        if backup_name in self.backup_service_objects:
            process, event_queue = self.backup_service_objects.pop(backup_name)
            process.terminate()
            process.join()
            # Update metadata
            self.metadata[backup_name]['status'] = 'Stopped'
            self.save_metadata()
            conn.sendall(f"Backup with name {backup_name} stopped\n".encode())
        else:
            conn.sendall(f"error:Backup with name {backup_name} not found\n".encode())

    def delete_backup(self, payload, conn):
        backup_name = payload.get("backup_name")
        if backup_name in self.metadata:
            # Stop the backup if it's running
            if backup_name in self.backup_service_objects:
                self.stop_backup(payload, conn)
            # Remove backup data
            backup_dir = self.metadata[backup_name]['backup_dir']
            if os.path.exists(backup_dir):
                import shutil
                shutil.rmtree(backup_dir)
            # Remove from metadata
            del self.metadata[backup_name]
            self.save_metadata()
            conn.sendall(f"Backup with name {backup_name} deleted\n".encode())
        else:
            conn.sendall(f"error:Backup with name {backup_name} not found\n".encode())

    def listen_to_events(self, backup_name, event_queue, conn):
        while True:
            try:
                event_type, message = event_queue.get()
                conn.sendall(f"{event_type}:{backup_name}:{message}\n".encode())
            except Exception as e:
                print(f"Error in event listener for backup {backup_name}: {e}")
                break

if __name__ == '__main__':
    try:
        orchestrator = BackupServiceOrchestrator()
        orchestrator.init_ipc_socket()
    except Exception as e:
        print(f"Error in BackupServiceOrchestrator: {e}")