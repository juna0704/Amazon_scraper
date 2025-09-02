from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException
import time
import random
import csv
import os
from datetime import datetime

CSV_FILE = 'amazon_products.csv'
PROGRESS_FILE = 'scraper_progress.txt'

def random_delay(min_seconds=2, max_seconds=4):
    """Add random delay to mimic human behavior"""
    delay = random.uniform(min_seconds, max_seconds)
    print(f"⏳ Waiting {delay:.1f} seconds...")
    time.sleep(delay)

def safe_get_text(element, selector):
    """Safely get text from an element"""
    try:
        sub_element = element.find_element(By.CSS_SELECTOR, selector)
        return sub_element.text.strip()
    except NoSuchElementException:
        return ""

def safe_get_attribute(element, selector, attribute):
    """Safely get attribute from an element"""
    try:
        sub_element = element.find_element(By.CSS_SELECTOR, selector)
        return sub_element.get_attribute(attribute) or ""
    except NoSuchElementException:
        return ""

def initialize_csv():
    """Initialize CSV file with headers if it doesn't exist"""
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow([
                'timestamp', 'asin', 'title', 'price', 'original_price', 
                'rating', 'review_count', 'image_url', 'product_url',
                'best_seller', 'delivery_info', 'scraped_successfully'
            ])
        print(f"📄 Created new CSV file: {CSV_FILE}")
    else:
        print(f"📄 Using existing CSV file: {CSV_FILE}")

def save_to_csv(product_data):
    """Save product data to CSV immediately"""
    try:
        with open(CSV_FILE, 'a', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
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
                'YES'
            ])
        print(f"💾 Saved to CSV: ASIN {product_data.get('asin', 'Unknown')}")
        return True
    except Exception as e:
        print(f"❌ Error saving to CSV: {e}")
        return False

def get_scraped_asins():
    """Get list of already scraped ASINs from CSV"""
    scraped_asins = set()
    if os.path.exists(CSV_FILE):
        try:
            with open(CSV_FILE, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    if row.get('asin') and row.get('scraped_successfully') == 'YES':
                        scraped_asins.add(row['asin'])
            print(f"📋 Found {len(scraped_asins)} already scraped products")
        except Exception as e:
            print(f"❌ Error reading existing CSV: {e}")
    return scraped_asins

def save_progress(current_index, total_products):
    """Save current progress"""
    try:
        with open(PROGRESS_FILE, 'w') as file:
            file.write(f"{current_index},{total_products}")
        print(f"💾 Progress saved: {current_index}/{total_products}")
    except Exception as e:
        print(f"❌ Error saving progress: {e}")

def load_progress():
    """Load previous progress"""
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, 'r') as file:
                current_index, total_products = map(int, file.read().strip().split(','))
                print(f"📋 Resuming from product {current_index + 1}/{total_products}")
                return current_index
        except Exception as e:
            print(f"❌ Error loading progress: {e}")
    return 0

def extract_comprehensive_product_data(product_element, product_num):
    """Extract comprehensive product data"""
    print(f"\n--- Extracting Product {product_num} ---")
    
    product_data = {}
    
    # Extract ASIN
    asin = product_element.get_attribute('data-asin') or ""
    product_data['asin'] = asin
    print(f"ASIN: {asin}")

    # Construct clean product URL
    if asin:
        product_url = f"https://www.amazon.in/dp/{asin}?th=1"
    else:
        product_url = ""
    product_data['product_url'] = product_url
    print(f"URL: {product_url if product_url else 'Not found'}")
    
    # Extract title
    title_selectors = ["h2 span", "h2 a span", "[data-cy='title-recipe'] span"]
    title = ""
    for selector in title_selectors:
        title = safe_get_text(product_element, selector)
        if title:
            break
    
    product_data['title'] = title
    title_display = title[:60] + "..." if len(title) > 60 else title
    print(f"Title: {title_display}")
    
    # Extract price
    price_selectors = [".a-price-whole", ".a-price .a-offscreen"]
    price = ""
    for selector in price_selectors:
        price = safe_get_text(product_element, selector)
        if price:
            break
    
    product_data['price'] = price
    print(f"Price: {price}")
    
    # Extract original price
    original_price_selectors = [".a-text-price .a-offscreen", "span[data-a-strike='true'] .a-offscreen"]
    original_price = ""
    for selector in original_price_selectors:
        original_price = safe_get_text(product_element, selector)
        if original_price:
            break
    
    product_data['original_price'] = original_price
    print(f"Original Price: {original_price}")
    
    # Extract rating
    rating = safe_get_text(product_element, ".a-icon-alt")
    product_data['rating'] = rating
    print(f"Rating: {rating}")
    
    # Extract review count
    review_selectors = ["a[aria-label*='ratings'] span", ".a-size-base.s-underline-text"]
    review_count = ""
    for selector in review_selectors:
        review_count = safe_get_text(product_element, selector)
        if review_count and review_count.replace(',', '').isdigit():
            break
    
    product_data['review_count'] = review_count
    print(f"Reviews: {review_count}")
    
    # Extract image URL
    image_selectors = [".s-image", "img[data-image-index]"]
    image_url = ""
    for selector in image_selectors:
        image_url = safe_get_attribute(product_element, selector, 'src')
        if image_url:
            break
    
    product_data['image_url'] = image_url
    print(f"Image: {'Found' if image_url else 'Not found'}")
    
    # # Extract product URL
    # url_selectors = [".s-link-style", "h2 a", "a[href*='/dp/']"]
    # product_url = ""
    # for selector in url_selectors:
    #     product_url = safe_get_attribute(product_element, selector, 'href')
    #     if product_url:
    #         break
    
    product_data['product_url'] = product_url
    print(f"URL: {'Found' if product_url else 'Not found'}")
    
    # Check for best seller
    try:
        badge_element = product_element.find_element(By.CSS_SELECTOR, ".a-badge-text")
        if "Best seller" in badge_element.text:
            product_data['best_seller'] = "YES"
            print("🏆 Best Seller: YES")
        else:
            product_data['best_seller'] = "NO"
    except NoSuchElementException:
        product_data['best_seller'] = "NO"
    
    # Extract delivery info
    delivery_selectors = [".udm-primary-delivery-message", "[data-cy='delivery-block']"]
    delivery_info = ""
    for selector in delivery_selectors:
        delivery_info = safe_get_text(product_element, selector)
        if delivery_info:
            break
    
    product_data['delivery_info'] = delivery_info
    print(f"Delivery: {delivery_info}")
    
    return product_data

# Configure Chrome options
chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--disable-blink-features=AutomationControlled")
chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
chrome_options.add_experimental_option('useAutomationExtension', False)

print("🚀 Starting Amazon Scraper with Resume Capability")
print("=" * 50)

# Initialize CSV and get already scraped ASINs
initialize_csv()
scraped_asins = get_scraped_asins()

browser = webdriver.Chrome(options=chrome_options)
browser.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

try:
    # Go to Amazon and search
    print("🌐 Opening Amazon India...")
    browser.get("https://www.amazon.in/")
    random_delay(3, 5)
    
    # Search for laptops
    print("🔍 Searching for laptops...")
    search_box = browser.find_element(By.ID, "twotabsearchtextbox")
    random_delay(1, 2)

    # to mimic human typing
    search_term = "laptop"
    for char in search_term:
        search_box.send_keys(char)
        time.sleep(random.uniform(0.1, 0.3))
    
    random_delay(1, 2)
    search_box.submit()
    random_delay(4, 6)
    
    # Wait for results
    WebDriverWait(browser, 15).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div[data-component-type='s-search-result']"))
    )
    random_delay(2, 3)
    
    # Get all products
    products = browser.find_elements(By.CSS_SELECTOR, "div[data-component-type='s-search-result']")
    total_products = len(products)
    print(f"📦 Found {total_products} products")
    
    # Load progress and start from where we left off
    start_index = load_progress()
    products_scraped_this_session = 0
    
    for i in range(start_index, total_products):
        try:
            product = products[i]
            
            # Get ASIN to check if already scraped
            asin = product.get_attribute('data-asin')
            
            if asin and asin in scraped_asins:
                print(f"\n⏭️ Skipping product {i+1} (ASIN: {asin}) - Already scraped")
                continue
            
            # Extract product data
            product_data = extract_comprehensive_product_data(product, i+1)
            
            # Save immediately to CSV
            if save_to_csv(product_data):
                products_scraped_this_session += 1
                scraped_asins.add(asin)  # Add to our set to avoid duplicates in this session
                
                # Save progress
                save_progress(i, total_products)
                
                print(f"✅ Product {i+1}/{total_products} saved successfully")
            else:
                print(f"❌ Failed to save product {i+1}")
            
            # Random delay between products
            random_delay(3, 6)
            
            # Safety break - don't scrape too many at once
            if products_scraped_this_session >= 10:
                print(f"\n🛑 Safety break: Scraped {products_scraped_this_session} products this session")
                break
                
        except Exception as e:
            print(f"❌ Error with product {i+1}: {e}")
            # Save progress even on error
            save_progress(i, total_products)
            continue
    
    print(f"\n🎉 Session completed!")
    print(f"📊 Products scraped this session: {products_scraped_this_session}")
    print(f"📄 All data saved to: {CSV_FILE}")

except Exception as e:
    print(f"❌ Major error: {e}")

finally:
    # Clean up
    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)
        print("🗑️ Cleaned up progress file")
    
    print("\n🔚 Closing browser...")
    browser.quit()
    print("✅ Scraper finished!")
    
    # Show CSV stats
    if os.path.exists(CSV_FILE):
        try:
            with open(CSV_FILE, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                total_rows = sum(1 for row in reader if row.get('scraped_successfully') == 'YES')
                print(f"📈 Total products in CSV: {total_rows}")
        except:
            pass