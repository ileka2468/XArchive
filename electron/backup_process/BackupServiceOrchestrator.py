import asyncio
import socket
import threading

from TwitterBackupService import TwitterBackupService

class BackupServiceOrchestrator:
    def __init__(self):
        self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.backup_service_objects = {}
        self.conn = None

    def init_ipc_socket(self):
        self.server.bind(('localhost', 12345))
        self.server.listen(1)
        print("Server listening on port 12345")
        while True:
            self.conn, addr = self.server.accept()
            print(f"Connection established with {addr}")
            while True:
                msg = self.conn.recv(1024).decode()
                if not msg:
                    break
                print(f"Received: {msg}")
                if msg == "action:startEligibleBackups":
                    try:
                        threading.Thread(target=self.start_backup_services).start()
                        self.conn.sendall("Backup started".encode())
                    except Exception as e:
                        error_message = f"Failed to start backups: {e}"
                        print(error_message)
                        self.conn.sendall(error_message.encode())
            self.conn.close()
            print("Connection closed")

    def start_backup_services(self):
        # Start backup services
        backup_service = TwitterBackupService('Jonderon115335', '09barrier.wakings@icloud.com', 'Password1234', None, event_callback=self.event_callback)
        self.backup_service_objects['b1'] = backup_service
        asyncio.run(backup_service.run_backup_service())

    def event_callback(self, message):
        print("Event callback called", message)
        self.conn.sendall(message.encode())

if __name__ == '__main__':
    try:
        orchestrator = BackupServiceOrchestrator()
        orchestrator.init_ipc_socket()
    except Exception as e:
        print(f"Error in BackupServiceOrchestrator: {e}")