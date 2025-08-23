# Clocwise - Time Tracking Application

A simple, elegant time tracking application built for freelancers and professionals.

## Features

- ⏱️ **Real-time Timer** - Start, pause, and stop time tracking
- 👥 **Client Management** - Organize clients with different hourly rates
- 📊 **Dashboard Analytics** - View daily, weekly, and monthly statistics
- 📝 **Time Entry Management** - Add and edit time entries manually
- 💰 **Earnings Tracking** - Calculate earnings based on hourly rates
- 🔐 **Secure Authentication** - JWT-based user authentication
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js, Express.js (optional/fallback)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (primary), JWT fallback
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Styling**: Modern CSS with responsive design
- **Hosting**: Designed for Vercel/Netlify deployment

## Prerequisites

- Node.js (v14 or higher) - *Optional for static hosting*
- Supabase Account (free tier available)
- npm or yarn package manager - *Optional for development*

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd clocwise
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase database**
   - Create a free account at [supabase.com](https://supabase.com)
   - Create a new project
   - Go to the SQL Editor and run the setup script from `SUPABASE_SETUP.md`
   - Get your project URL and anon key from Settings > API

4. **Configure environment variables**
   - Copy `.env.example` to `.env` and update with your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Optional for Express server functionality
   DATABASE_URL=postgresql://postgres:your_password@db.your-project-id.supabase.co:5432/postgres
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=3000
   NODE_ENV=development
   ```

5. **Start the application**
   ```bash
   # For development with Express server
   npm run dev
   
   # For production
   npm start
   
   # For static hosting (Vercel/Netlify)
   # Simply upload the public/ folder
   ```

6. **Access the application**
   - Local development: `http://localhost:3000`
   - Static hosting: Access your deployed URL

## Project Structure

```
clocwise/
├── server.js              # Express server (optional/fallback)
├── package.json           # Dependencies and scripts  
├── database-setup.sql     # PostgreSQL database schema (legacy)
├── SUPABASE_SETUP.md      # Supabase database setup instructions
├── .env                   # Environment variables
├── .env.example           # Environment variables template
├── vercel.json            # Vercel deployment configuration
├── .gitignore             # Git ignore file
├── LICENSE                # MIT License
├── README.md              # This file
└── public/                # Static frontend files
    ├── index.html         # Landing page
    ├── auth.html          # Sign up / Login page
    ├── dashboard.html     # Main application dashboard
    └── debug.html         # Debug/testing page
```

## Architecture

The application uses **Supabase** as the primary backend service:

### Frontend-First Architecture
- **Authentication**: Supabase Auth handles user registration, login, and session management
- **Database**: Direct client-side queries to Supabase PostgreSQL with Row Level Security (RLS)
- **Real-time**: Built-in real-time subscriptions available through Supabase

### Optional Express Server
The included `server.js` provides fallback API endpoints for:
- Traditional REST API architecture
- Custom business logic
- Third-party integrations
- Local development without Supabase

### Database Tables
- `clients` - Client information and hourly rates
- `projects` - Projects associated with clients  
- `time_entries` - Time tracking records with duration in seconds

## Database Schema

**Current Tables (Supabase):**
- `clients` - Client information and hourly rates
- `projects` - Projects associated with clients  
- `time_entries` - Time tracking records with duration in seconds

**Authentication:**
- Managed by Supabase Auth (`auth.users` table)

**Security Features:**
- Row Level Security (RLS) policies ensure users only access their own data
- Foreign key constraints for data integrity
- Indexes for optimal query performance
- Real-time subscriptions available

**Future Features:**
- `invoices` - Invoice generation
- `invoice_items` - Invoice line items
- Advanced reporting and analytics

## Development

1. **Install development dependencies**
   ```bash
   npm install --save-dev nodemon
   ```

2. **Run in development mode**
   ```bash
   npm run dev
   ```

3. **Code Structure**
   - Frontend files are in the `public/` directory (primary application)
   - Optional backend API routes in `server.js` (fallback/additional features)
   - Supabase database setup in `SUPABASE_SETUP.md`
   - Environment configuration in `.env` (copy from `.env.example`)

## Features Coming Soon

- 📧 **Invoice Generation** - Create and send professional invoices
- 📈 **Advanced Reports** - Detailed analytics and insights
- 📤 **Data Export** - Export time data to various formats
- 🔄 **API Integration** - Connect with popular tools
- 📱 **Mobile App** - Native mobile applications

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub or contact the development team.

---

**Clocwise** - Simple time tracking for professionals