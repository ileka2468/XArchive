import asyncio
import socket
import logging
import threading

from TwitterBackupService import TwitterBackupService

class BackupServiceOrchestrator:
    def __init__(self):
        self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.backup_service_objects = {}

    def init_ipc_socket(self):
        self.server.bind(('localhost', 12345))
        self.server.listen(1)
        print("Server listening on port 12345")  # This message is critical
        while True:
            conn, addr = self.server.accept()
            print(f"Connection established with {addr}")
            while True:
                msg = conn.recv(1024).decode()
                if not msg:
                    break
                print(f"Received: {msg}")
                if msg == "action:startEligibleBackups":
                    try:
                        threading.Thread(target=self.start_backup_services).start()
                        conn.sendall("Backup started".encode())
                    except Exception as e:
                        error_message = f"Failed to start backups: {e}"
                        print(error_message)
                        conn.sendall(error_message.encode())
            conn.close()
            print("Connection closed")

    def start_backup_services(self):
        # Start backup services here
        backup_service = TwitterBackupService('Jonderon115335', '09barrier.wakings@icloud.com', 'Password1234', None)
        self.backup_service_objects['b1'] = backup_service
        asyncio.run(backup_service.run_backup_service())

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    try:
        orchestrator = BackupServiceOrchestrator()
        orchestrator.init_ipc_socket()
    except Exception as e:
        logging.error(f"Error in BackupServiceOrchestrator: {e}")
        print(f"Error in BackupServiceOrchestrator: {e}")