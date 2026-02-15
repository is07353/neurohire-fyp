
  #python -m uvicorn main:app --reload --port 8000
  #npm run uploadthing-server
  # npm run dev

 DATABASE_URL=postgresql://neondb_owner:npg_7Yzfsr8QoSkI@ep-raspy-bar-a1doe4s3-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

 UPLOADTHING_TOKEN='eyJhcGlLZXkiOiJza19saXZlXzc5ZWVhMmFkZTg1MmZjNjMwYjI3OTlkY2RlYWFkNzc0NWZlZTM4ZTY0N2Y1OGViNTRkNTg1MDM5NTRkNGJhMzYiLCJhcHBJZCI6Inpqd3RkNzllcTIiLCJyZWdpb25zIjpbInNlYTEiXX0='

python -m pip install fastapi uvicorn asyncpg python-dotenv requests
python -m pip install email-validator
pip install gradio_client

  # NeuroHire – Frontend, Backend & DB Setup

  This project contains a React (Vite) frontend, a FastAPI backend, and a Neon PostgreSQL database.  
  The original design was based on: https://www.figma.com/design/I5Cxf5xRjHc9JMmuw9ZH5D/Candidate-Dashboard-Design--Copy-.

  ---

  ## 1. Prerequisites

  Install these tools first:

  - **Node.js** (LTS) – includes `npm`
  - **Python 3.10+**
  - **Git**
  - A **Neon PostgreSQL** project (database) with a connection string

  ---

  ## 2. Clone and install frontend dependencies

  ```bash
  git clone <this-repo-url>
  cd neurohire-fyp
  npm install
  ```

  To run the React app:

  ```bash
  npm run dev
  ```

  The frontend is a Vite app; by default it runs on `http://localhost:5173` (or the port Vite prints).

  ---

  ## 3. Configure Neon database via `.env`

  1. In the project root (`neurohire-fyp`), create a file named `.env`.
  2. Put only the URL portion into `.env` as `DATABASE_URL`:

     ```bash
     DATABASE_URL=postgresql://neondb_owner:npg_7Yzfsr8QoSkI@ep-raspy-bar-a1doe4s3-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
     ```

  4. The `.gitignore` is already configured to ignore `.env` so secrets are not committed.

  ---

  ## 4. FastAPI backend setup (Neon connection)

  Backend code lives in `Backend/main.py`.

  From the project root:

  ```bash
  cd Backend
  pip install fastapi uvicorn asyncpg python-dotenv
  ```

  Notes:

  - If `pip` is not recognized, use `python -m pip install ...`.
  - If you use a virtual environment, activate it first and then run the install command.

  To start the backend:

  ```bash
  uvicorn main:app --reload
  ```

  The API will run on `http://127.0.0.1:8000`.

  ### 4.1 Verify DB connection

  The backend creates a connection pool to Neon using the `DATABASE_URL` from `.env` and exposes a simple health endpoint.

  With the backend running, open:

  - `http://127.0.0.1:8000/db-health`

  You should receive:

  ```json
  { "ok": 1 }
  ```

  This confirms that the backend can connect to the Neon database using the `.env` file.

  You can also open the automatic API docs at:

  - `http://127.0.0.1:8000/docs`

  ---

  ## 5. Prisma + Neon (Node.js) setup

  Prisma is optional and used if you want a Node-based backend or tooling layer talking to the same Neon database.

  From the project root:

  ```bash
  cd neurohire-fyp  # if you are not already here
  npm install prisma --save-dev
  npm install @prisma/client
  ```

  Then initialize Prisma:

  ```bash
  npx prisma init
  ```

  - This creates a `prisma/` folder with `schema.prisma`.
  - Ensure `.env` still contains your `DATABASE_URL` pointing to Neon.

  ### 5.1 Introspect or sync schema

  - To introspect an existing database schema into Prisma models:

    ```bash
    npx prisma db pull
    ```

  - After you define or change models in `prisma/schema.prisma`, sync them to the database and regenerate the client:

    ```bash
    npx prisma db push
    npx prisma generate
    ```

  ### 5.2 Inspect database with Prisma Studio

  Run:

  ```bash
  npx prisma studio
  ```

  This opens a web UI where you can view and edit tables in your Neon database.

  ---

  ## 6. Summary – what needs to be installed

  - **Node.js** (to run the React/Vite frontend and Prisma)
  - **Python 3.10+** (to run the FastAPI backend)
  - **Neon PostgreSQL** project with a connection string
  - **Python packages**: `fastapi`, `uvicorn`, `asyncpg`, `python-dotenv`
  - **Node packages**:
    - Runtime/dev: those listed in `package.json` (installed via `npm install`)
    - Optional DB tooling: `prisma` (dev dependency) and `@prisma/client`
  