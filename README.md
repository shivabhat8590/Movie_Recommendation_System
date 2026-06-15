# MovieAI — Recommendation System

A full-stack AI-powered movie recommendation platform.

## 🚀 Quick Start (Running the Project)

To run the complete system, you need to open **three separate terminals**.

### 1. Backend Server (Node.js)
```bash
cd server
npm run dev
```
*Runs on [http://localhost:5000](http://localhost:5000)*

### 2. ML Service (Python)
```bash
cd ml-service
uvicorn app.main:app --reload --port 8000
```
*Runs on [http://localhost:8000](http://localhost:8000)*

### 3. Frontend (React + Vite)
```bash
cd client
npm run dev
```
*Runs on [http://localhost:5173](http://localhost:5173)*

---

## 👤 Login Credentials
The system is pre-seeded with an user account:
- **Email**: `test@movieai.com`
- **Password**: `test@123`

---

## 🛠 Prerequisites
Ensure you have the following installed:
- **Node.js** (v18+)
- **Python** (3.9+)
- **MongoDB** (Running locally on default port 27017)

## 📦 Features
- **Large Dataset**: 1000+ mock movies (No API key required).
- **AI Recommendations**: Content-based and Mood-based discovery.
- **Real-time**: Socket.io integration for instant updates.
- **User System**: Wishlist, Watch History, and Ratings.
- **Premium UI**: Modern dark-mode design with glassmorphism.

---

## 🔧 Maintenance Commands
- **Re-generate 1000 Movies**: `node server/src/scripts/generateMockData.js`
- **Re-seed Database**: `node server/src/scripts/seed.js`
