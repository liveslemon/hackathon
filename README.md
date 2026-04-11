# PAU Interconnect

PAU Interconnect is a comprehensive platform designed to bridge the gap between students, educators, and industry professionals. Built for the Pan-Atlantic University community, it streamlines the internship application process, provides AI-powered career tools, and manages official academic requirements like SIWES logbooks.

## 🚀 Features

- **Student Dashboard**: Track applications, manage documents, and view internship progress.
- **AI Career Assistant**: Generate professional cover letters and motivation letters tailored to specific job descriptions using LLMs.
- **SIWES Digital Logbook**: A tamper-proof, digital system for students to record daily internship activities and for employers to review them.
- **Document Management**: Upload and manage CVs, academic transcripts, and other essential documents.
- **Employer/Admin Portal**: Manage internship listings and review student submissions.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [MUI Joy / Material UI](https://mui.com/)
- **State Management**: React Context API
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Forms**: React Hook Form + Zod

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **AI/ML**: OpenAI GPT models, Sentence Transformers (for embeddings)
- **Email Service**: [Resend](https://resend.com/)
- **Deployment**: [Render](https://render.com/)

## 📂 Project Structure

```text
.
├── backend/                # FastAPI application
│   ├── core/               # Configuration and security
│   ├── routers/            # API endpoints
│   ├── schemas/            # Pydantic models
│   ├── services/           # Business logic (Supabase, AI, Email)
│   └── main.py             # Entry point
├── frontend/
│   └── pau-interconnect-app/
│       ├── app/            # Next.js App Router pages
│       ├── components/     # Reusable UI components
│       ├── lib/            # Utilities and Supabase client
│       └── public/         # Static assets
└── render.yaml             # Infrastructure as Code for Render
```

## ⚙️ Local Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file based on `.env.example` (if available) or add:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   OPENAI_API_KEY=your_key
   RESEND_API_KEY=your_key
   ```
5. Run the server:
   ```bash
   python -m uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend/pau-interconnect-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## 🌐 Deployment

The project is configured for deployment on **Render** using the `render.yaml` file.

- **Backend**: Deployed as a Python web service.
- **Frontend**: Can be deployed to Vercel or as a static site on Render.

## 📄 License

This project is developed for the Pan-Atlantic University Hackathon.
