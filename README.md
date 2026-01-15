# D&D Card Crafter

A comprehensive web application for creating, customizing, and printing D&D 5e monster cards with AI-generated artwork.

## 🎯 Overview

D&D Card Crafter is a powerful tool for Dungeon Masters and players to create professional-quality printable monster cards. The application integrates with the Open5e API to provide access to thousands of monsters, features AI-powered image generation, and allows full customization of card content.

## ✨ Key Features

### 🔍 Monster Search & Discovery
- **Search Functionality**: Search through thousands of monsters from the Open5e API
- **Advanced Filtering**: Filter monsters by:
  - Challenge Rating (CR) range
  - Hit Points range
  - Size (Tiny, Small, Medium, Large, Huge, Gargantuan)
  - Type (Aberration, Beast, Dragon, etc.)
- **Pagination**: Browse through results with pagination (50 items per page)
- **Quick Add**: Add monsters to your selection with a single click

### ✏️ Custom Card Creation
- **Full Customization**: Create completely custom monster cards with:
  - Name, size, type, alignment
  - Armor Class and Hit Points
  - Ability scores (STR, DEX, CON, INT, WIS, CHA)
  - Speed (walk, fly, swim)
  - Damage resistances, immunities, and vulnerabilities
  - Condition immunities
  - Special abilities and actions
  - Senses and languages
- **Form Validation**: Smart form validation ensures data integrity
- **Custom Image Upload**: Upload custom images for your custom monsters

### 📋 Selected Monsters Management
- **Quantity Control**: Adjust the quantity of each monster (for multiple copies)
- **Visual Miniatures**: View vertical-format image previews (2:3 aspect ratio)
- **Image Generation**: Generate AI images directly from the selected tab
- **Quick Preview**: Open detailed preview dialogs for any monster
- **Bulk Operations**: Clear all selections at once
- **Remove Individual**: Remove specific monsters from your selection

### 🎨 Image Management
- **AI Image Generation**: 
  - Automatically generates images for monsters missing artwork
  - Uses OpenAI's DALL-E 3 API for high-quality vertical portraits
  - Images generated in 1024x1536 resolution (2:3 aspect ratio)
  - Supports French descriptions for better image generation
- **Image Regeneration**:
  - Regenerate images from the preview dialog or card view
  - Accept/Reject workflow to compare new vs. existing images
  - Accept saves the new image permanently
  - Reject reverts to the previous image
- **Image Sources**:
  - **Local Database**: Pre-scraped official Monster Manual 5e images (300+ monsters)
  - **AI Generation**: OpenAI DALL-E 3 for missing or custom images
- **Smart Caching**: Runtime cache ensures fast image loading across components

### 👁️ Card Preview
- **Detailed Preview Dialog**: 
  - Full-size card preview with stat block
  - Side-by-side layout (image + stat block)
  - Regenerate button in top-right corner of image
  - Accept/Reject controls for regenerated images
- **Print Preview**: 
  - Grid layout optimized for A4 landscape printing
  - 4 cards per page with proper spacing
  - Full stat blocks visible

### 📄 PDF Generation
- **Professional PDF Export**:
  - High-quality PDF generation using jsPDF and html2canvas
  - Automatic image preloading and conversion
  - Proper card sizing (72mm x 200mm per card)
  - Optimized for A4 landscape format
- **Download Support**: Direct PDF download with progress indicators

### 📊 Analytics Tracking
- **Usage Analytics**: Tracks key user events:
  - Monster searches
  - Monsters added to selection
  - PDF downloads
  - Image regenerations
- **Analytics API**: Access analytics via REST API endpoints

## 🛠️ Technologies

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn-ui** - High-quality React component library
- **TanStack Query** - Data fetching and caching
- **React Router** - Client-side routing
- **Sonner** - Toast notifications

### Backend
- **Express.js** - Node.js web framework
- **OpenAI API** - DALL-E 3 for image generation
- **File System** - Local image storage and analytics

### PDF Generation
- **jsPDF** - PDF generation library
- **html2canvas** - HTML to canvas conversion

## 📦 Installation

### Prerequisites
- Node.js 18+ ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn
- OpenAI API key (optional, for image generation)

### Setup Steps

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Step 2: Install dependencies
npm install

# Step 3: Set up environment variables
# Create a .env file in the project root:
OPENAI_API_KEY=your_openai_api_key_here
API_PORT=3001
NODE_ENV=development

# Step 4: Start the development servers
# Option A: Start both frontend and API server together
npm run dev:all

# Option B: Start them separately (in two terminals)
# Terminal 1: Frontend (default: http://localhost:5173)
npm run dev

# Terminal 2: API server (default: http://localhost:3001)
npm run dev:api
```

## 🎮 Usage Guide

### 1. Search for Monsters
- Navigate to the **Search** tab
- Enter a monster name or leave blank to browse all
- Use filters to narrow down results
- Click the **+** button to add monsters to your selection

### 2. Create Custom Cards
- Navigate to the **Custom Card** tab
- Fill in all monster details
- Optionally upload a custom image
- Click **Add Card** to add to your selection

### 3. Manage Your Selection
- Navigate to the **Selected** tab
- Adjust quantities using +/- buttons
- Click **Generate** on image preview to create AI artwork
- Click the **Preview** icon to see detailed card view
- Click **Clear All** to remove all selections

### 4. Regenerate Images
- Open any monster's preview dialog (from Selected tab or Preview tab)
- Click the **Refresh** button (↻) in the top-right corner of the image
- Wait for the new image to generate
- Choose **Accept** (✓) to save the new image or **Reject** (✗) to keep the previous one

### 5. Generate PDF
- Navigate to the **Preview** tab
- Review your cards in the print layout
- Click **Generate PDF** to create and download the PDF file

## 📝 Scripts

```sh
# Development
npm run dev              # Start frontend dev server
npm run dev:api          # Start API server
npm run dev:all          # Start both servers concurrently

# Production
npm run build            # Build for production
npm run build:prod       # Build with production optimizations
npm run preview          # Preview production build

# Image Management
npm run scrape-images    # Scrape monster images from Forgotten Realms Wiki
npm run migrate-images   # Migrate images to local storage

# Production Server
npm start                # Start production server
npm run start:pm2        # Start with PM2 process manager

# Code Quality
npm run lint             # Run ESLint
```

## 🗂️ Project Structure

```
dnd-card-crafter/
├── public/
│   ├── images/
│   │   └── monsters/    # Local monster images
│   └── ...
├── server/
│   ├── api.js           # Express API server
│   └── analytics.js     # Analytics service
├── src/
│   ├── components/      # React components
│   │   ├── ui/          # shadcn-ui components
│   │   ├── MonsterCard.tsx
│   │   ├── MonsterSearch.tsx
│   │   ├── SelectedMonsters.tsx
│   │   ├── CustomCardForm.tsx
│   │   ├── CardPreviewDialog.tsx
│   │   ├── PDFGenerator.tsx
│   │   └── ...
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions
│   │   ├── monster-images.ts
│   │   ├── monster-images-api.ts
│   │   ├── open5e.ts
│   │   └── analytics.ts
│   ├── pages/           # Page components
│   └── types/           # TypeScript types
├── scripts/             # Utility scripts
├── data/                # Data files (analytics, etc.)
└── ...
```

## 🖼️ Image Sources

Monster images are sourced from two places:

1. **Local Database**: Pre-scraped official Monster Manual 5e images from Forgotten Realms Wiki
   - Over 300 monsters included
   - Run `npm run scrape-images` to update the database

2. **AI Generation**: OpenAI DALL-E 3 generates images for:
   - Monsters not in the local database
   - Custom monsters
   - On-demand regeneration requests

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# OpenAI API (required for image generation)
OPENAI_API_KEY=your_api_key_here

# Server Configuration
API_PORT=3001
NODE_ENV=development

# Frontend URL (for CORS in production)
FRONTEND_URL=http://localhost:5173

# Analytics (optional)
ANALYTICS_ENABLED=true
```

## 🚀 Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

Quick deployment steps:
1. Set up production environment variables
2. Build the application: `npm run build`
3. Start the server: `npm start` or use PM2: `npm run start:pm2`
4. Configure Nginx as reverse proxy (see `nginx.conf.example`)

## 📊 Analytics API

Access analytics data via REST endpoints:

```bash
# Get summary (last 30 days)
GET /api/analytics/summary?days=30

# Get recent events
GET /api/analytics/events?limit=50

# Health check
GET /api/health
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🔗 Resources

- [Open5e API](https://open5e.com/) - Monster data source
- [OpenAI DALL-E](https://openai.com/dall-e-3) - Image generation
- [D&D 5e SRD](https://dnd.wizards.com/resources/systems-reference-document) - Game content reference

---

Made with ❤️ for the D&D community
