# 🛒 Amazon Product Scraper

A **Node.js + Express** application that scrapes product data from Amazon and stores it in a MongoDB database.  
This project is built with scalability, performance, and security in mind — using tools like **Helmet**, **Rate Limiting**, and **JWT Authentication**.

---

## 🚀 Features

- Scrape product details (title, price, rating, reviews, etc.)  
- Save data to MongoDB for later analysis  
- CSV/JSON export support for scraped data  
- JWT-based authentication for secure API access  
- Rate limiting to prevent abuse  
- Helmet for enhanced security  
- Environment variables support with `dotenv`  
- Developer-friendly setup with `nodemon`

---

## 🧩 Tech Stack

| Layer | Technology |
|--------|-------------|
| Backend | Node.js, Express.js |
| Database | MongoDB (via Mongoose) |
| Security | Helmet, express-rate-limit, bcryptjs, JWT |
| Utilities | dotenv, csv-parser |
| Dev Tools | nodemon, colors |

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/juna0704/Amazon_scraper.git
cd Amazon_scraper

📂 Project Structure
amazon_scraper/
├── server/
│   ├── server.js          # Entry point
│   ├── routes/            # Express routes
│   ├── controllers/       # Business logic
│   ├── models/            # Mongoose schemas
│   ├── middleware/        # Auth, rate-limit, error handling
│   └── utils/             # Helper functions (scraping, etc.)
├── scripts/
│   └── seed.js            # Seed data script
├── package.json
└── README.md

