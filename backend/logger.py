import logging
import logging.handlers
from config import CONFIG


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("pcd-foc")
    logger.setLevel(CONFIG.log_level)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(CONFIG.log_level)

    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    if CONFIG.log_file:
        file_handler = logging.handlers.RotatingFileHandler(
            CONFIG.log_file, maxBytes=10_000_000, backupCount=5
        )
        file_handler.setLevel(CONFIG.log_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


logger = setup_logging()
