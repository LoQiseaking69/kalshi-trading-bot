import time
import logging
from config import KALSHI_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, BANKROLL, TRADE_INTERVAL_SECONDS
from kalshi_api import KalshiAPI
from trader import Trader
from notifier import Notifier
from logger import Logger

def setup_logging():
    logging.basicConfig(level=logging.INFO, format=\'%(asctime)s - %(levelname)s - %(message)s\')
    logger = Logger()
    return logger

def main():
    logger = setup_logging()
    logger.info("Starting Kalshi Trading Bot")

    try:
        api = KalshiAPI(KALSHI_API_KEY)
        notifier = Notifier(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
        trader = Trader(api, notifier, logger, BANKROLL)

        while True:
            logger.info("Running trading strategy")
            trader.run_trading_strategy()
            time.sleep(TRADE_INTERVAL_SECONDS)

    except Exception as e:
        logger.error(f"An error occurred: {e}")
        notifier.send_error_notification(str(e))

if __name__ == "__main__":
    main()

