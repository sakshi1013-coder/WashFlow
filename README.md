# WashFlow | Laundry Order Management System 🧺

WashFlow is a premium, lightweight laundry management system designed for small to medium laundry businesses. It provides a clean, intuitive interface for managing customers, orders, and business metrics.

## 🚀 Features Implemented

- **Dynamic Dashboard**: Real-time stats on total orders, revenue, and order status (Processing/Ready).
- **Multi-Item Order Creation**: Create complex orders with multiple garment types (Shirt, Pants, Saree, etc.), quantities, and individual pricing.
- **SQLite Persistence**: Robust data storage using SQLite, ensuring all orders and users are saved permanently.
- **Basic Authentication**: Secure staff login system (Default: `admin` / `password`).
- **Real-time Order Tracking**: Live status updates with dedicated badges and searchable order history.
- **Smart Search**: Filter orders by Order ID, Customer Name, Phone, or specific Garment Types.
- **Premium Aesthetics**: A custom-curated color palette (Navy, Teal, Sky Blue) with elegant typography using *Playfair Display*.
- **Responsive Design**: Fully functional on mobile, tablet, and desktop.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (via `better-sqlite3`)
- **Authentication**: `express-session`, `bcryptjs`
- **Frontend**: Vanilla HTML5, CSS3 (Modern Variables & Flexbox), Javascript (ES6+)

## ⚙️ Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/sakshi1013-coder/WashFlow.git
   cd WashFlow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   node server.js
   ```

4. Open your browser and navigate to:
   `http://localhost:3000`

### Default Credentials
- **Username**: `admin`
- **Password**: `password`

## 🤖 AI Usage Report

This project was built in collaboration with **Antigravity** (Google DeepMind's Advanced Agentic Coding AI).

### Prompts Used
- "Add basic authentication with a login modal."
- "Migrate the in-memory array to a SQLite database for persistence."
- "Fix dashboard loading errors caused by hardcoded localhost URLs."
- "Change the color theme to match this specific palette [Image Provided]."
- "Implement a searchable orders list that filters by garment type."

### AI Contributions & Improvements
- **What AI got wrong**: Initially, the AI used hardcoded `http://localhost:3000` for API calls, which caused connectivity issues in different environments. It also initially lacked error handling for missing data in the order list.
- **Manual Improvements/Fixes**: I corrected the API paths to be relative (`/api`), added robust `.trim()` logic to the login form, and implemented fallback rendering for the garment summary to prevent UI crashes.
- **Aesthetic Refinement**: The AI suggested using *Playfair Display* for a premium "boutique" feel, which I refined to ensure consistency across the dashboard.

## ⚖️ Tradeoffs & Future Scope

### Tradeoffs
- **In-Memory Sessions**: Currently uses standard express-sessions. For enterprise scaling, a Redis store would be preferred.
- **Plain JS Frontend**: Chose Vanilla JS over React/Vue to keep the bundle size extremely small and ensure instant loading for a "Mini System" requirement.

### Future Improvements
- **Receipt Generation**: The UI has a "Receipt" button that currently triggers a placeholder. Automating PDF generation is the next priority.
- **SMS Notifications**: Automated status updates via Twilio for customers when their laundry is "READY".
- **Inventory Management**: Tracking detergent and supply usage alongside orders.

---
Created by Sakshi Shingole | Laundry Management Assignment 2026
