def validate_api_key(api_key):
    if not api_key or not isinstance(api_key, str):
        raise ValueError("Invalid API key provided.")

def validate_telegram_token(token):
    if not token or not isinstance(token, str):
        raise ValueError("Invalid Telegram bot token provided.")

def validate_chat_id(chat_id):
    if not isinstance(chat_id, int):
        raise ValueError("Invalid chat ID provided. It must be an integer.")

def format_trade_message(trade_details):
    return f"Trade executed: {trade_details}"

def calculate_risk_amount(bankroll, risk_factor):
    return bankroll * risk_factor

def is_valid_trade_interval(interval):
    return interval > 0

def log_error(error_message):
    # Placeholder for error logging functionality
    print(f"Error: {error_message}")