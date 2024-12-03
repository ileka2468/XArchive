class MessageBroker:
    def __init__(self, broker_callback):
        self.broker_callback = broker_callback

    def send_activity(self, message):
        self.broker_callback("activity", message)

    def send_error(self, message):
        self.broker_callback("error", message)