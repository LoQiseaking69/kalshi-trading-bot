import requests
import logging
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

class Notifier:
    def __init__(self, bot_token=None, chat_id=None):
        self.bot_token = bot_token or TELEGRAM_BOT_TOKEN
        self.chat_id = chat_id or TELEGRAM_CHAT_ID
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        logging.basicConfig(level=logging.INFO)

    def send_message(self, message):
        try:
            payload = {
                'chat_id': self.chat_id,
                'text': message,
                'parse_mode': 'Markdown'
            }
            response = requests.post(self.base_url, json=payload)
            response.raise_for_status()
            logging.info("Message sent successfully: %s", message)
        except requests.exceptions.HTTPError as http_err:
            logging.error("HTTP error occurred: %s", http_err)
        except Exception as err:
            logging.error("An error occurred: %s", err)

    def send_trade_notification(self, message):
        """Send trade notification"""
        self.send_message(f"🔔 Trade: {message}")

    def send_error_notification(self, error_message):
        """Send error notification"""
        self.send_message(f"❌ Error: {error_message}")

    def notify_trade_action(self, action, details):
        message = f"Trade Action: {action}\nDetails: {details}"
        self.send_message(message)

    def notify_error(self, error_message):
        message = f"Error Notification: {error_message}"
        self.send_message(message)

    def notify_system_status(self, status_message):
        message = f"System Status: {status_message}"
        self.send_message(message)