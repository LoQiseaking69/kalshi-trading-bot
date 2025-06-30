import requests
import logging
from config import KALSHI_API_KEY

class KalshiAPI:
    BASE_URL = "https://api.kalshi.com/v1"

    def __init__(self, api_key=None):
        self.api_key = api_key or KALSHI_API_KEY
        self.logger = logging.getLogger(__name__)

    def _handle_request(self, method, endpoint, **kwargs):
        url = f"{self.BASE_URL}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        try:
            response = requests.request(method, url, headers=headers, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request error occurred: {req_err}")
        return None

    def get_market_data(self, market_id):
        endpoint = f"/markets/{market_id}"
        return self._handle_request("GET", endpoint)

    def fetch_market_data(self):
        """Fetch general market data"""
        endpoint = "/markets"
        return self._handle_request("GET", endpoint)

    def place_trade(self, market_id, trade_data):
        endpoint = f"/markets/{market_id}/trades"
        return self._handle_request("POST", endpoint, json=trade_data)

    def get_account_balance(self):
        endpoint = "/account/balance"
        return self._handle_request("GET", endpoint)