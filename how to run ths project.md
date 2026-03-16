# How to run this project

This project has two main parts: a backend API (Node.js/Express) and a frontend web application (React/Vite). Below are the steps to set up and run both locally.

## Prerequisite: Database

1. Ensure **MySQL Server** is running on your machine.
2. Ensure you have a database named `halleyx_db` created in MySQL. If not, open your MySQL shell and run:
   ```sql
   CREATE DATABASE halleyx_db;
   ```
3. Make sure the credentials in the `backend/.env` file match your MySQL setup.
   ```
   DATABASE_URL=mysql://root:root@localhost:3306/halleyx_db
   ```

---

## 1. Setup & Run the Backend

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
```

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Sync the Database**
   Push the Prisma schema to your MySQL database to create the required tables:
   ```bash
   npx prisma db push
   ```

3. **Generate Prisma Client**
   Initialize the Prisma Client for use in the app:
   ```bash
   npx prisma generate
   ```

4. **Start the Server**
   Build and start the node server on port 5000:
   ```bash
   npm run build
   npm start
   ```
   If you want to run it in development mode instead, you can run `npm run dev`.

---

## 2. Setup & Run the Frontend

Open a **new terminal** and navigate to the `frontend` directory:

```bash
cd frontend
```

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Dev Server**
   ```bash
   npm run dev
   ```

The terminal will print out a local URL (e.g. `http://localhost:5173`). Open that URL in your web browser. 

---

## Exploring the App

- **Orders**: Click the "Orders" page on the sidebar to view, add, edit, or delete order data.
- **Dashboard**: Use the "Dashboard" builder. You can drag and drop widgets from the left sidebar onto the layout grid. Settings for these widgets can be accessed by hovering over a widget and clicking the gear icon to configure metrics.
- Don't forget to **Save Layout** to persist your dashboard configurations across browser sessions!
