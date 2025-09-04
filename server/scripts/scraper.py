import argparse
import sys
import requests
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException
import time
import random
import csv
import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Set
import re
from dataclasses import dataclass
from enum import Enum

# Configuration Constants
DEFAULT_CSV_FILE = 'amazon_products.csv'
DEFAULT_JSON_FILE = 'amazon_products.json'
PROGRESS_FILE = 'scraper_progress.json'
LOG_FILE = 'scraper.log'
API_BASE_URL = 'http://localhost:5000/api'

class StatusCode(Enum):
    SUCCESS = 200
    PARTIAL_SUCCESS = 206
    NOT_FOUND = 404
    TIMEOUT = 408
    ERROR = 500
    ALREADY_EXISTS = 409
    RATE_LIMITED = 429

@dataclass
class ScrapingResult:
    status_code: StatusCode
    message: str
    data: Optional[Dict] = None
    error_details: Optional[str] = None

class EnhancedAmazonScraper:
    def __init__(self, headless: bool = False, enable_proxy: bool = False, job_id: str = None):
        self.job_id = job_id
        # Create output directories if they don't exist
        self.setup_output_directories()
        
        # Initialize default file paths BEFORE setup_logging()
        self.csv_file = os.path.join(self.csv_dir, DEFAULT_CSV_FILE)
        self.json_file = os.path.join(self.json_dir, DEFAULT_JSON_FILE)
        self.log_file = os.path.join(self.log_dir, LOG_FILE)
        self.progress_file = os.path.join(self.log_dir, PROGRESS_FILE)
        
        # Now setup logging with the initialized log_file path
        self.setup_logging()
        
        self.scraped_asins: Set[str] = set()
        self.total_scraped = 0
        self.session_scraped = 0
        self.current_page = 1
        self.headless = headless
        self.enable_proxy = enable_proxy
        self.product_name = ""
        
        # Proxy configuration (commented out by default)
        self.proxy_list = [
            # "http://proxy1:port",
            # "http://proxy2:port",
            # Add your proxy servers here
        ]
        self.current_proxy_index = 0
        
        self.browser = None

        
    def setup_output_directories(self):
        """Create output directories if they don't exist"""
        # Get the base directory (one level up from scripts folder)
        base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output_files")
        
        # Define directory paths
        self.csv_dir = os.path.join(base_dir, "csv")
        self.json_dir = os.path.join(base_dir, "json")
        self.log_dir = os.path.join(base_dir, "logs")
        
        # Create directories if they don't exist
        os.makedirs(self.csv_dir, exist_ok=True)
        os.makedirs(self.json_dir, exist_ok=True)
        os.makedirs(self.log_dir, exist_ok=True)
        
    def setup_logging(self):
        """Setup comprehensive logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.log_file, encoding='utf-8'),
                logging.StreamHandler(sys.stdout)  # Output to stdout for Node.js capture
            ]
        )
        self.logger = logging.getLogger(__name__)

    def reconfigure_logging(self):
        """Reconfigure logging with new file handlers"""
        # Remove existing file handlers
        for handler in self.logger.handlers[:]:
            if isinstance(handler, logging.FileHandler):
                self.logger.removeHandler(handler)
        
        # Add new file handler with the updated log file path
        file_handler = logging.FileHandler(self.log_file, encoding='utf-8')
        file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        self.logger.addHandler(file_handler)

    def update_job_status(self, status: str, message: str = "", error: str = None):
        """Update job status via API"""
        if not self.job_id:
            return
            
        try:
            data = {
                'status': status,
                'message': message,
                'timestamp': datetime.now().isoformat()
            }
            
            if error:
                data['error'] = error
                
            response = requests.post(
                f"{API_BASE_URL}/jobs/{self.job_id}/status",
                json=data,
                timeout=5
            )
        except Exception as e:
            self.logger.warning(f"Failed to update job status: {e}")

    def update_job_progress(self, current_product: int, total_products: int, current_page: int, percentage: float):
        """Update job progress via API"""
        if not self.job_id:
            return
            
        try:
            data = {
                'progress': {
                    'currentProduct': current_product,
                    'totalProducts': total_products,
                    'currentPage': current_page,
                    'percentage': percentage
                },
                'timestamp': datetime.now().isoformat()
            }
            
            response = requests.post(
                f"{API_BASE_URL}/jobs/{self.job_id}/progress",
                json=data,
                timeout=5
            )
        except Exception as e:
            self.logger.warning(f"Failed to update job progress: {e}")

    def add_job_log(self, log_message: str):
        """Add log entry via API"""
        if not self.job_id:
            return
            
        try:
            data = {
                'log': log_message,
                'timestamp': datetime.now().isoformat()
            }
            
            response = requests.post(
                f"{API_BASE_URL}/jobs/{self.job_id}/logs",
                json=data,
                timeout=5
            )
        except Exception as e:
            self.logger.warning(f"Failed to add job log: {e}")

    def set_product_name(self, product_name: str):
        """Set product name and update file paths"""
        self.product_name = product_name.strip()
        if self.product_name:
            safe_name = self.product_name.replace(" ", "_").lower()
            # Remove any special characters that might cause file issues
            safe_name = re.sub(r'[^\w\-_]', '', safe_name)
            self.csv_file = os.path.join(self.csv_dir, f"{safe_name}.csv")
            self.json_file = os.path.join(self.json_dir, f"{safe_name}.json")
            self.log_file = os.path.join(self.log_dir, f"{safe_name}.log")
            self.progress_file = os.path.join(self.log_dir, f"{safe_name}_progress.json")
        else:
            # Use default file names if no product name provided
            self.csv_file = os.path.join(self.csv_dir, DEFAULT_CSV_FILE)
            self.json_file = os.path.join(self.json_dir, DEFAULT_JSON_FILE)
            self.log_file = os.path.join(self.log_dir, LOG_FILE)
            self.progress_file = os.path.join(self.log_dir, PROGRESS_FILE)
        
        # Reconfigure logging with the new log file
        self.reconfigure_logging()
        
        self.logger.info(f"📁 Using files: CSV={self.csv_file}, JSON={self.json_file}")
        self.add_job_log(f"📁 Using files: CSV={self.csv_file}, JSON={self.json_file}")

    def get_random_user_agent(self) -> str:
        """Get random user agent to mimic different browsers"""
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15"
        ]
        return random.choice(user_agents)

    def setup_proxy(self, chrome_options):
        """Setup proxy configuration (commented out by default)"""
        if self.enable_proxy and self.proxy_list:
            proxy = self.proxy_list[self.current_proxy_index % len(self.proxy_list)]
            chrome_options.add_argument(f'--proxy-server={proxy}')
            self.logger.info(f"Using proxy: {proxy}")
            self.current_proxy_index += 1
        
    def initialize_browser(self) -> ScrapingResult:
        """Initialize Chrome browser with human-like settings"""
        try:
            chrome_options = webdriver.ChromeOptions()
            
            # Anti-detection measures
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--disable-web-security")
            chrome_options.add_argument("--allow-running-insecure-content")
            
            # Random user agent
            chrome_options.add_argument(f"--user-agent={self.get_random_user_agent()}")
            
            # Window size randomization
            width = random.randint(1200, 1920)
            height = random.randint(800, 1080)
            chrome_options.add_argument(f"--window-size={width},{height}")
            
            if self.headless:
                chrome_options.add_argument("--headless")
            
            self.browser = webdriver.Chrome(options=chrome_options)
            
            # Additional anti-detection
            self.browser.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            self.browser.execute_script("Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]})")
            self.browser.execute_script("Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']})")
            
            log_msg = "🌐 Browser initialized successfully"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            
            return ScrapingResult(StatusCode.SUCCESS, "Browser initialized successfully")
            
        except Exception as e:
            error_msg = f"Failed to initialize browser: {str(e)}"
            self.logger.error(error_msg)
            self.add_job_log(f"❌ {error_msg}")
            return ScrapingResult(StatusCode.ERROR, "Failed to initialize browser", error_details=str(e))

    def human_like_typing(self, element, text: str):
        """Simulate human-like typing with random delays"""
        element.clear()
        for char in text:
            element.send_keys(char)
            time.sleep(random.uniform(0.05, 0.2))

    def random_delay(self, min_seconds: float = 2.0, max_seconds: float = 4.0):
        """Add random delay with status logging"""
        delay = random.uniform(min_seconds, max_seconds)
        log_msg = f"⏳ Random delay: {delay:.2f}s"
        self.logger.info(log_msg)
        self.add_job_log(log_msg)
        time.sleep(delay)

    def pagination_delay(self, page_number: int):
        """Special delay for pagination to avoid detection"""
        base_delay = 30  # 30 seconds base
        random_extra = random.uniform(5, 15)  # Extra 5-15 seconds
        total_delay = base_delay + random_extra
        
        log_msg = f"📄 Page {page_number} navigation delay: {total_delay:.1f}s"
        self.logger.info(log_msg)
        self.add_job_log(log_msg)
        time.sleep(total_delay)

    def initialize_csv(self) -> ScrapingResult:
        """Initialize CSV file with headers"""
        try:
            if not os.path.exists(self.csv_file):
                with open(self.csv_file, 'w', newline='', encoding='utf-8') as file:
                    writer = csv.writer(file)
                    writer.writerow([
                        'timestamp', 'asin', 'title', 'price', 'original_price', 
                        'rating', 'review_count', 'image_url', 'product_url',
                        'best_seller', 'delivery_info', 'page_number', 'scraped_successfully'
                    ])
                log_msg = f"📄 Created new CSV file: {self.csv_file}"
                self.logger.info(log_msg)
                self.add_job_log(log_msg)
                return ScrapingResult(StatusCode.SUCCESS, f"Created new CSV file: {self.csv_file}")
            else:
                log_msg = f"📄 Using existing CSV file: {self.csv_file}"
                self.logger.info(log_msg)
                self.add_job_log(log_msg)
                return ScrapingResult(StatusCode.ALREADY_EXISTS, f"Using existing CSV file: {self.csv_file}")
        except Exception as e:
            error_msg = f"Failed to initialize CSV: {str(e)}"
            self.logger.error(error_msg)
            self.add_job_log(f"❌ {error_msg}")
            return ScrapingResult(StatusCode.ERROR, "Failed to initialize CSV", error_details=str(e))

    def save_to_csv(self, product_data: Dict, page_number: int) -> ScrapingResult:
        """Save product data to CSV"""
        try:
            file_exists = os.path.isfile(self.csv_file)

            with open(self.csv_file, 'a', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)

                # Write headers only once
                if not file_exists:
                    writer.writerow([
                        "timestamp", "asin", "title", "price", "original_price",
                        "rating", "review_count", "image_url", "product_url",
                        "best_seller", "delivery_info", "page_number", "scraped_successfully"
                    ])

                writer.writerow([
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    product_data.get('asin', ''),
                    product_data.get('title', ''),
                    product_data.get('price', ''),
                    product_data.get('original_price', ''),
                    product_data.get('rating', ''),
                    product_data.get('review_count', ''),
                    product_data.get('image_url', ''),
                    product_data.get('product_url', ''),
                    product_data.get('best_seller', ''),
                    product_data.get('delivery_info', ''),
                    page_number,
                    'YES'
                ])
            
            log_msg = f"💾 Saved ASIN {product_data.get('asin', 'Unknown')} to CSV"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            return ScrapingResult(StatusCode.SUCCESS, f"Saved ASIN {product_data.get('asin', 'Unknown')} to CSV")
        except Exception as e:
            error_msg = f"Failed to save to CSV: {str(e)}"
            self.logger.error(error_msg)
            self.add_job_log(f"❌ {error_msg}")
            return ScrapingResult(StatusCode.ERROR, "Failed to save to CSV", error_details=str(e))

    def convert_csv_to_json(self) -> ScrapingResult:
        """Convert CSV data to JSON format"""
        try:
            if not os.path.exists(self.csv_file):
                return ScrapingResult(StatusCode.NOT_FOUND, "CSV file not found")
            
            fields = [
                "timestamp", "asin", "title", "price", "original_price",
                "rating", "review_count", "image_url", "product_url",
                "best_seller", "delivery_info", "page_number", "scraped_successfully"
            ]
            
            json_data = []
            with open(self.csv_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get("scraped_successfully") == "YES":
                        # Re-map into clean structure
                        item = {field: row.get(field, "") for field in fields}
                        json_data.append(item)

            with open(self.json_file, "w", encoding="utf-8") as f:
                json.dump(json_data, f, indent=4, ensure_ascii=False)

            log_msg = f"📝 Converted {len(json_data)} records to JSON: {self.json_file}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)

            return ScrapingResult(
                StatusCode.SUCCESS,
                f"Converted {len(json_data)} records to JSON: {self.json_file}"
            )
        except Exception as e:
            error_msg = f"Failed to convert CSV to JSON: {str(e)}"
            self.logger.error(error_msg)
            self.add_job_log(f"❌ {error_msg}")
            return ScrapingResult(StatusCode.ERROR, "Failed to convert CSV to JSON", error_details=str(e))

    def get_scraped_asins(self) -> ScrapingResult:
        """Get set of already scraped ASINs"""
        try:
            scraped_asins = set()
            if os.path.exists(self.csv_file):
                with open(self.csv_file, 'r', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        if row.get('asin') and row.get('scraped_successfully') == 'YES':
                            scraped_asins.add(row['asin'])
            
            self.scraped_asins = scraped_asins
            log_msg = f"📋 Found {len(scraped_asins)} already scraped products"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            return ScrapingResult(StatusCode.SUCCESS, f"Found {len(scraped_asins)} already scraped products", 
                                data={'scraped_asins': scraped_asins})
        except Exception as e:
            error_msg = f"Failed to get scraped ASINs: {str(e)}"
            self.logger.error(error_msg)
            self.add_job_log(f"❌ {error_msg}")
            return ScrapingResult(StatusCode.ERROR, "Failed to get scraped ASINs", error_details=str(e))

    def save_progress(self, current_index: int, total_products: int, page_number: int) -> ScrapingResult:
        """Save current scraping progress to JSON"""
        try:
            progress_data = {
                'current_index': current_index,
                'total_products': total_products,
                'page_number': page_number,
                'session_scraped': self.session_scraped,
                'timestamp': datetime.now().isoformat()
            }
            
            with open(self.progress_file, 'w') as file:
                json.dump(progress_data, file, indent=2)
                
            # Update progress via API
            percentage = (current_index / total_products) * 100 if total_products > 0 else 0
            self.update_job_progress(current_index, total_products, page_number, percentage)
                
            return ScrapingResult(StatusCode.SUCCESS, f"Progress saved: {current_index}/{total_products} (Page {page_number})")
        except Exception as e:
            return ScrapingResult(StatusCode.ERROR, "Failed to save progress", error_details=str(e))

    def safe_get_text(self, element, selector: str) -> str:
        """Safely extract text from element"""
        try:
            sub_element = element.find_element(By.CSS_SELECTOR, selector)
            return sub_element.text.strip()
        except NoSuchElementException:
            return ""

    def safe_get_attribute(self, element, selector: str, attribute: str) -> str:
        """Safely extract attribute from element"""
        try:
            sub_element = element.find_element(By.CSS_SELECTOR, selector)
            return sub_element.get_attribute(attribute) or ""
        except NoSuchElementException:
            return ""

    def extract_product_data(self, product_element, product_num: int, page_number: int) -> ScrapingResult:
        """Extract comprehensive product data with status reporting"""
        try:
            log_msg = f"--- Extracting Product {product_num} (Page {page_number}) ---"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            
            product_data = {}
            
            # Extract ASIN
            asin = product_element.get_attribute('data-asin') or ""
            product_data['asin'] = asin
            
            if not asin:
                return ScrapingResult(StatusCode.NOT_FOUND, "ASIN not found")
            
            if asin in self.scraped_asins:
                return ScrapingResult(StatusCode.ALREADY_EXISTS, f"ASIN {asin} already scraped")

            # Construct clean product URL
            product_url = f"https://www.amazon.in/dp/{asin}?th=1"
            product_data['product_url'] = product_url
            
            # Extract title
            title_selectors = ["h2 span", "h2 a span", "[data-cy='title-recipe'] span"]
            title = ""
            for selector in title_selectors:
                title = self.safe_get_text(product_element, selector)
                if title:
                    break
            
            product_data['title'] = title
            
            # Extract price
            price_selectors = [".a-price-whole", ".a-price .a-offscreen", ".a-price-range .a-price .a-offscreen"]
            price = ""
            for selector in price_selectors:
                price = self.safe_get_text(product_element, selector)
                if price and price.strip():
                    break
            
            product_data['price'] = price
            log_msg = f"💰 Current Price: {price}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            
            html = product_element.get_attribute("innerHTML")

            mrp_matches = re.search(
                r'<span[^>]*class="[^"]*a-text-price[^"]*"[^>]*>\s*<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>(₹[\d,]+)</span>',
                html
            )
            original_price = mrp_matches.group(1) if mrp_matches else ""
            product_data['original_price'] = original_price
            log_msg = f"🏷️ Original Price (MRP): {original_price}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)

            # Extract rating
            rating_match = re.search(r'([\d.]+)\s*out of 5 stars', html)
            rating = rating_match.group(1) if rating_match else ""
            product_data['rating'] = rating
            log_msg = f"⭐ Rating: {rating}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            
            # Extract review count
            review_selectors = ["a[aria-label*='ratings'] span", ".a-size-base.s-underline-text"]
            review_count = ""
            for selector in review_selectors:
                review_count = self.safe_get_text(product_element, selector)
                if review_count and review_count.replace(',', '').isdigit():
                    break
            
            product_data['review_count'] = review_count
            
            # Extract image URL
            image_selectors = [".s-image", "img[data-image-index]"]
            image_url = ""
            for selector in image_selectors:
                image_url = self.safe_get_attribute(product_element, selector, 'src')
                if image_url:
                    break
            
            product_data['image_url'] = image_url
            
            # Check for best seller badge
            try:
                badge_element = product_element.find_element(By.CSS_SELECTOR, ".a-badge-text")
                product_data['best_seller'] = "YES" if "Best seller" in badge_element.text else "NO"
            except NoSuchElementException:
                product_data['best_seller'] = "NO"
            
            # Extract delivery info
            delivery_selectors = [".udm-primary-delivery-message", "[data-cy='delivery-block']"]
            delivery_info = ""
            for selector in delivery_selectors:
                delivery_info = self.safe_get_text(product_element, selector)
                if delivery_info:
                    break
            
            product_data['delivery_info'] = delivery_info
            
            # Log extracted data summary
            title_display = title[:50] + "..." if len(title) > 50 else title
            log_msg = f"✓ ASIN: {asin}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            log_msg = f"✓ Title: {title_display}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            log_msg = f"✓ Price: {price}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            
            return ScrapingResult(StatusCode.SUCCESS, f"Successfully extracted product {product_num}", data=product_data)
            
        except Exception as e:
            error_msg = f"Failed to extract product {product_num}: {str(e)}"
            self.logger.error(error_msg)
            self.add_job_log(f"❌ {error_msg}")
            return ScrapingResult(StatusCode.ERROR, f"Failed to extract product {product_num}", error_details=str(e))

    def go_to_next_page(self) -> ScrapingResult:
        """Navigate to next page with enhanced delay and error handling"""
        try:
            log_msg = f"➡️ Attempting to navigate to page {self.current_page + 1}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            
            # Add pagination delay BEFORE attempting navigation
            self.pagination_delay(self.current_page + 1)
            
            # Find next button
            next_button = WebDriverWait(self.browser, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "a.s-pagination-next"))
            )
            
            # Scroll to button with human-like behavior
            self.browser.execute_script("arguments[0].scrollIntoView({behavior: 'smooth'});", next_button)
            self.random_delay(2, 4)
            
            # Click with JavaScript to avoid interception
            self.browser.execute_script("arguments[0].click();", next_button)
            
            # Wait for page load
            WebDriverWait(self.browser, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div[data-component-type='s-search-result']"))
            )
            
            self.current_page += 1
            self.random_delay(3, 6)
            
            log_msg = f"✅ Successfully navigated to page {self.current_page}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            
            return ScrapingResult(StatusCode.SUCCESS, f"Successfully navigated to page {self.current_page}")
            
        except (TimeoutException, NoSuchElementException) as e:
            error_msg = "Next page button not found or navigation failed"
            self.logger.warning(error_msg)
            self.add_job_log(f"⚠️ {error_msg}")
            return ScrapingResult(StatusCode.NOT_FOUND, "Next page button not found or navigation failed", 
                                error_details=str(e))
        except Exception as e:
            error_msg = f"Navigation error: {str(e)}"
            self.logger.error(error_msg)
            self.add_job_log(f"❌ {error_msg}")
            return ScrapingResult(StatusCode.ERROR, "Navigation error", error_details=str(e))

    def search_products(self, search_term: str) -> ScrapingResult:
        """Perform product search with human-like behavior"""
        try:
            if not search_term:
                search_term = "laptop"  # default if user enters nothing

            log_msg = "🌐 Opening Amazon India..."
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            self.browser.get("https://www.amazon.in/")
            self.random_delay(3, 5)
            
            # Handle potential popups/cookies
            try:
                cookie_button = self.browser.find_element(By.ID, "sp-cc-accept")
                cookie_button.click()
                self.random_delay(1, 2)
            except NoSuchElementException:
                pass
            
            log_msg = f"🔍 Searching for: {search_term}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            search_box = self.browser.find_element(By.ID, "twotabsearchtextbox")
            
            # Human-like typing
            self.human_like_typing(search_box, search_term)
            self.random_delay(1, 3)
            
            # Submit search
            search_box.submit()
            self.random_delay(4, 7)
            
            # Wait for results
            WebDriverWait(self.browser, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div[data-component-type='s-search-result']"))
            )
            
            log_msg = f"✅ Successfully searched for '{search_term}'"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            
            return ScrapingResult(StatusCode.SUCCESS, f"Successfully searched for '{search_term}'")
            
        except Exception as e:
            error_msg = f"Search failed: {str(e)}"
            self.logger.error(error_msg)
            self.add_job_log(f"❌ {error_msg}")
            return ScrapingResult(StatusCode.ERROR, "Search failed", error_details=str(e))

    def display_bold_summary(self, total_scraped: int, pages_scraped: int):
        """Display a bold summary message"""
        summary = f"""
{"="*70}
🎯{"═" * 64}🎯
{"="*70}
   📦 Product: {self.product_name.upper() if self.product_name else 'GENERAL'}
   ✅ Products Scraped: {total_scraped}
   📄 Pages Processed: {pages_scraped}
   💾 CSV File: {os.path.abspath(self.csv_file)}
   📝 JSON File: {os.path.abspath(self.json_file)}
{"="*70}
   🎉 SCRAPING COMPLETED SUCCESSFULLY! 🎉
{"="*70}
"""
        print(summary)
        self.add_job_log(summary)

    def run_scraper(self, product_name: str, max_products_per_session: int, max_pages: int) -> ScrapingResult:
        """Main scraper execution with comprehensive error handling"""
        # Set product name and file paths
        self.set_product_name(product_name)
        
        log_msg = "🚀 Starting Enhanced Amazon Scraper"
        self.logger.info(log_msg)
        self.add_job_log(log_msg)
        self.logger.info("=" * 60)
        
        # Update job status to running
        self.update_job_status('running', f'Starting scraping for "{product_name}"')
        
        # Initialize browser
        result = self.initialize_browser()
        if result.status_code != StatusCode.SUCCESS:
            self.update_job_status('failed', 'Failed to initialize browser', result.error_details)
            return result
        
        try:
            # Initialize CSV
            csv_result = self.initialize_csv()
            self.logger.info(f"📄 CSV Status: {csv_result.message}")
            
            # Load existing scraped ASINs
            asins_result = self.get_scraped_asins()
            self.logger.info(f"📋 ASINs Status: {asins_result.message}")
            
            # Search for products
            search_result = self.search_products(product_name)
            if search_result.status_code != StatusCode.SUCCESS:
                self.update_job_status('failed', 'Search failed', search_result.error_details)
                return search_result
            
            pages_scraped = 0
            total_session_scraped = 0
            
            while pages_scraped < max_pages and total_session_scraped < max_products_per_session:
                try:
                    # Get products on current page
                    products = self.browser.find_elements(By.CSS_SELECTOR, "div[data-component-type='s-search-result']")
                    log_msg = f"📦 Found {len(products)} products on page {self.current_page}"
                    self.logger.info(log_msg)
                    self.add_job_log(log_msg)
                    
                    page_scraped = 0
                    for i, product in enumerate(products):
                        if total_session_scraped >= max_products_per_session:
                            break
                            
                        # Extract product data
                        extract_result = self.extract_product_data(product, i + 1, self.current_page)
                        
                        if extract_result.status_code == StatusCode.SUCCESS:
                            # Save to CSV
                            csv_save_result = self.save_to_csv(extract_result.data, self.current_page)
                            
                            if csv_save_result.status_code == StatusCode.SUCCESS:
                                self.scraped_asins.add(extract_result.data['asin'])
                                total_session_scraped += 1
                                page_scraped += 1
                                
                                log_msg = f"✅ [{extract_result.status_code.value}] {csv_save_result.message}"
                                self.logger.info(log_msg)
                                self.add_job_log(log_msg)
                                
                                # Save progress
                                progress_save = self.save_progress(i, len(products), self.current_page)
                                
                            else:
                                error_msg = f"❌ [{csv_save_result.status_code.value}] {csv_save_result.message}"
                                self.logger.error(error_msg)
                                self.add_job_log(error_msg)
                        
                        elif extract_result.status_code == StatusCode.ALREADY_EXISTS:
                            log_msg = f"⏭️ [{extract_result.status_code.value}] {extract_result.message}"
                            self.logger.info(log_msg)
                            self.add_job_log(log_msg)
                        else:
                            warn_msg = f"⚠️ [{extract_result.status_code.value}] {extract_result.message}"
                            self.logger.warning(warn_msg)
                            self.add_job_log(warn_msg)
                        
                        # Random delay between products
                        self.random_delay(2, 5)
                    
                    log_msg = f"📊 Page {self.current_page} completed: {page_scraped} products scraped"
                    self.logger.info(log_msg)
                    self.add_job_log(log_msg)
                    pages_scraped += 1
                    
                    # Try to go to next page
                    if pages_scraped < max_pages and total_session_scraped < max_products_per_session:
                        next_page_result = self.go_to_next_page()
                        if next_page_result.status_code != StatusCode.SUCCESS:
                            warn_msg = f"🛑 [{next_page_result.status_code.value}] {next_page_result.message}"
                            self.logger.warning(warn_msg)
                            self.add_job_log(warn_msg)
                            break
                        else:
                            log_msg = f"✅ [{next_page_result.status_code.value}] {next_page_result.message}"
                            self.logger.info(log_msg)
                            self.add_job_log(log_msg)
                    
                except Exception as e:
                    error_msg = f"❌ [500] Error on page {self.current_page}: {str(e)}"
                    self.logger.error(error_msg)
                    self.add_job_log(error_msg)
                    continue
            
            # Convert CSV to JSON
            json_result = self.convert_csv_to_json()
            log_msg = f"📝 [{json_result.status_code.value}] {json_result.message}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            
            # Log session summary
            log_msg = "🎉 SESSION COMPLETED SUCCESSFULLY!"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            log_msg = f"📊 Total products scraped: {total_session_scraped}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            log_msg = f"📄 Pages processed: {pages_scraped}"
            self.logger.info(log_msg)
            self.add_job_log(log_msg)
            
            # Display bold summary
            self.display_bold_summary(total_session_scraped, pages_scraped)
            
            # Update job status to completed
            self.update_job_status('completed', f'Successfully scraped {total_session_scraped} products from {pages_scraped} pages')
            
            final_message = f"Session completed: {total_session_scraped} products scraped across {pages_scraped} pages"
            return ScrapingResult(StatusCode.SUCCESS, final_message, 
                                data={'total_scraped': total_session_scraped, 'pages_scraped': pages_scraped})
            
        except Exception as e:
            error_msg = f"❌ [500] Scraper execution failed: {str(e)}"
            self.logger.error(error_msg)
            self.add_job_log(error_msg)
            self.update_job_status('failed', 'Scraper execution failed', str(e))
            return ScrapingResult(StatusCode.ERROR, "Scraper execution failed", error_details=str(e))
        
        finally:
            # Always cleanup, even on errors
            self.cleanup()

    def cleanup(self):
        """Cleanup resources and temporary files with robust error handling"""
        try:
            # Close browser with multiple fallback methods
            if self.browser:
                try:
                    # Try graceful quit first
                    self.browser.quit()
                    log_msg = "🔚 Browser closed gracefully"
                    self.logger.info(log_msg)
                    self.add_job_log(log_msg)
                except Exception as e:
                    try:
                        # If quit fails, try to close
                        self.browser.close()
                        log_msg = "🔚 Browser closed forcefully"
                        self.logger.info(log_msg)
                        self.add_job_log(log_msg)
                    except Exception as e2:
                        # If both fail, just log and continue
                        warn_msg = f"⚠️ Browser cleanup issue (this is normal): {str(e2)[:100]}"
                        self.logger.warning(warn_msg)
                        self.add_job_log(warn_msg)
                finally:
                    # Set browser to None to prevent further attempts
                    self.browser = None
            
            # Clean up progress file
            try:
                if os.path.exists(self.progress_file):
                    os.remove(self.progress_file)
                    log_msg = "🗑️ Progress file cleaned up"
                    self.logger.info(log_msg)
                    self.add_job_log(log_msg)
            except Exception as e:
                warn_msg = f"⚠️ Could not remove progress file: {str(e)}"
                self.logger.warning(warn_msg)
                self.add_job_log(warn_msg)
                
            # Show final statistics
            try:
                if os.path.exists(self.csv_file):
                    with open(self.csv_file, 'r', encoding='utf-8') as file:
                        reader = csv.DictReader(file)
                        total_records = sum(1 for row in reader if row.get('scraped_successfully') == 'YES')
                        log_msg = f"📈 Total products in database: {total_records}"
                        self.logger.info(log_msg)
                        self.add_job_log(log_msg)
                        
                    # Show file locations
                    log_msg = f"📄 CSV file saved: {os.path.abspath(self.csv_file)}"
                    self.logger.info(log_msg)
                    self.add_job_log(log_msg)
                    if os.path.exists(self.json_file):
                        log_msg = f"📝 JSON file saved: {os.path.abspath(self.json_file)}"
                        self.logger.info(log_msg)
                        self.add_job_log(log_msg)
                        
            except Exception as e:
                warn_msg = f"⚠️ Could not read final statistics: {str(e)}"
                self.logger.warning(warn_msg)
                self.add_job_log(warn_msg)
                
        except Exception as e:
            error_msg = f"❌ Cleanup error: {str(e)}"
            self.logger.error(error_msg)
            self.add_job_log(error_msg)


def main():
    """Main function with command line argument parsing"""
    parser = argparse.ArgumentParser(description='Enhanced Amazon Scraper with API Integration')
    parser.add_argument('--product-name', required=True, help='Product name to search for')
    parser.add_argument('--max-products', type=int, default=5, help='Maximum products to scrape')
    parser.add_argument('--max-pages', type=int, default=1, help='Maximum pages to navigate')
    parser.add_argument('--job-id', help='Job ID for API integration')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--enable-proxy', action='store_true', help='Enable proxy rotation')
    
    args = parser.parse_args()
    
    print("🚀 Enhanced Amazon Scraper with API Integration")
    print("-" * 60)
    print(f"📋 Configuration:")
    print(f"   - Product: {args.product_name}")
    print(f"   - Max Products: {args.max_products}")
    print(f"   - Max Pages: {args.max_pages}")
    print(f"   - Job ID: {args.job_id}")
    print(f"   - Headless Mode: {args.headless}")
    print(f"   - Proxy Enabled: {args.enable_proxy}")
    print("-" * 60)

    scraper = None

    try:
        scraper = EnhancedAmazonScraper(
            headless=args.headless, 
            enable_proxy=args.enable_proxy, 
            job_id=args.job_id
        )

        print("\n🌐 Starting scraper...\n")
        result = scraper.run_scraper(
            args.product_name, 
            max_products_per_session=args.max_products, 
            max_pages=args.max_pages
        )

        print("\n🎯 Scraper Finished!")
        print(f"   - Status: [{result.status_code.value}] {result.message}")
        
        if result.data:
            print(f"📊 Summary:")
            print(f"   - Products Scraped: {result.data['total_scraped']}")
            print(f"   - Pages Processed: {result.data['pages_scraped']}")
        
        # File locations
        safe_name = args.product_name.replace(" ", "_").lower()
        csv_file = os.path.join(scraper.csv_dir, f"{safe_name}.csv")
        json_file = os.path.join(scraper.json_dir, f"{safe_name}.json")
        
        if os.path.exists(csv_file):
            print(f"📄 CSV saved: {os.path.abspath(csv_file)}")
        if os.path.exists(json_file):
            print(f"📝 JSON saved: {os.path.abspath(json_file)}")
        
        print("\n✅ Scraping completed successfully!")
        
        # Exit with appropriate code
        if result.status_code == StatusCode.SUCCESS:
            sys.exit(0)
        else:
            sys.exit(1)
    
    except KeyboardInterrupt:
        print("\n🛑 Scraper interrupted by user (Ctrl+C).")
        if scraper:
            print("🔄 Cleaning up resources...")
        sys.exit(130)  # Standard exit code for Ctrl+C
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        if scraper:
            print("🔄 Cleaning up resources...")
        sys.exit(1)
    finally:
        if scraper:
            try:
                scraper.cleanup()
            except Exception:
                print("⚠️ Cleanup completed with minor issues.")
        
        print("🏁 Scraper session ended.")


# Usage example for interactive mode
if __name__ == "__main__":
    # Check if running with command line arguments
    if len(sys.argv) > 1:
        main()
    else:
        # Interactive mode (original behavior)
        print("🚀 Welcome to the Enhanced Amazon Scraper!")
        print("You can configure the number of products to scrape and the maximum pages to navigate.")
        print("-" * 60)

        # Default settings
        DEFAULT_MAX_PRODUCTS = 5
        DEFAULT_MAX_PAGES = 1
        HEADLESS_MODE = False
        ENABLE_PROXY = False

        # Get user input with defaults
        try:
            product_name = input("Enter product name to search: ").strip()
            max_products_input = input(f"Enter max products to scrape [default {DEFAULT_MAX_PRODUCTS}]: ").strip()
            max_pages_input = input(f"Enter max pages to navigate [default {DEFAULT_MAX_PAGES}]: ").strip()
            
            MAX_PRODUCTS = int(max_products_input) if max_products_input else DEFAULT_MAX_PRODUCTS
            MAX_PAGES = int(max_pages_input) if max_pages_input else DEFAULT_MAX_PAGES
        except ValueError:
            print("⚠️ Invalid input, using default values.")
            MAX_PRODUCTS = DEFAULT_MAX_PRODUCTS
            MAX_PAGES = DEFAULT_MAX_PAGES
            product_name = "laptop"

        print("\n📋 Configuration:")
        print(f"   - Product: {product_name}")
        print(f"   - Max Products: {MAX_PRODUCTS}")
        print(f"   - Max Pages: {MAX_PAGES}")
        print(f"   - Headless Mode: {HEADLESS_MODE}")
        print(f"   - Proxy Enabled: {ENABLE_PROXY}")
        print("-" * 60)

        scraper = None

        try:
            scraper = EnhancedAmazonScraper(headless=HEADLESS_MODE, enable_proxy=ENABLE_PROXY)

            print("\n🌐 Starting scraper...\n")
            result = scraper.run_scraper(product_name, max_products_per_session=MAX_PRODUCTS, max_pages=MAX_PAGES)

            print("\n🎯 Scraper Finished!")
            print(f"   - Status: [{result.status_code.value}] {result.message}")
            
            if result.data:
                print(f"📊 Summary:")
                print(f"   - Products Scraped: {result.data['total_scraped']}")
                print(f"   - Pages Processed: {result.data['pages_scraped']}")
            
            # File locations
            safe_name = product_name.replace(" ", "_").lower() if product_name else "amazon_products"
            csv_file = os.path.join(scraper.csv_dir, f"{safe_name}.csv")
            json_file = os.path.join(scraper.json_dir, f"{safe_name}.json")
            
            if os.path.exists(csv_file):
                print(f"📄 CSV saved: {os.path.abspath(csv_file)}")
            if os.path.exists(json_file):
                print(f"📝 JSON saved: {os.path.abspath(json_file)}")
            
            print("\n✅ Scraping completed successfully!")
        
        except KeyboardInterrupt:
            print("\n🛑 Scraper interrupted by user (Ctrl+C).")
            if scraper:
                print("🔄 Cleaning up resources...")
        except Exception as e:
            print(f"\n❌ Unexpected error: {str(e)}")
            if scraper:
                print("🔄 Cleaning up resources...")
        finally:
            if scraper:
                try:
                    scraper.cleanup()
                except Exception:
                    print("⚠️ Cleanup completed with minor issues.")
            
            print("🏁 Scraper session ended.")