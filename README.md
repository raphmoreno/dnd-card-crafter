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

### Backend (Cloudflare)
- **Cloudflare Workers** - Serverless API functions
- **Cloudflare R2** - Object storage for images
- **Cloudflare KV** - Key-value store for analytics
- **Cloudflare D1** - SQL database for monster data
- **OpenAI API** - GPT Image model for image generation

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

# Step 3: Start the development server
npm run dev

# The frontend will run on http://localhost:5173
# Make sure to configure VITE_API_URL to point to your Cloudflare Worker
# See DEPLOYMENT.md for full setup instructions
```

For production deployment to Cloudflare, see [DEPLOYMENT.md](./DEPLOYMENT.md).

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

# Production
npm run build            # Build for production
npm run build:prod       # Build with production optimizations
npm run preview          # Preview production build

# Database (Cloudflare D1)
npm run db:setup         # Create database schema (remote)
npm run db:setup:local   # Create database schema (local)

# Deployment
npm run deploy           # Build and deploy to Cloudflare Pages

# Code Quality
npm run lint             # Run ESLint
```

## 🗂️ Project Structure

```
dnd-card-crafter/
├── cloudflare/
│   ├── worker.js        # Cloudflare Worker (API)
│   └── schema.sql       # D1 database schema
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
├── wrangler.toml        # Cloudflare Workers configuration
└── ...
```

## 🖼️ Image Sources

Monster images are generated and stored in Cloudflare R2:

1. **AI Generation**: OpenAI GPT Image model generates images for:
   - All monsters (on-demand)
   - Custom monsters
   - On-demand regeneration requests
   - Images are cached in R2 for fast access

2. **Image Storage**: All images are stored in Cloudflare R2 and served through the Worker

## 🔧 Configuration

### Environment Variables

For local development, create a `.env.local` file:

```env
# API URL pointing to your Cloudflare Worker
VITE_API_URL=https://your-worker.workers.dev

# Analytics (optional)
VITE_ANALYTICS_ENABLED=true
```

For production deployment, configure these in Cloudflare:
- **Worker**: Set `OPENAI_API_KEY` via `wrangler secret put OPENAI_API_KEY`
- **Pages**: Set `VITE_API_URL` and `VITE_ANALYTICS_ENABLED` in Pages settings

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full configuration details.

## 🚀 Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

The application is designed to run on Cloudflare:
- **Frontend**: Deployed to Cloudflare Pages
- **API**: Deployed to Cloudflare Workers
- **Images**: Stored in Cloudflare R2
- **Data**: Stored in Cloudflare D1 and KV

## 📊 API Endpoints

All endpoints are available through the Cloudflare Worker:

```bash
# Health check
GET /api/health

# Monster search
GET /api/monsters?search=goblin&limit=500

# Get single monster
GET /api/monsters/:slug

# Generate monster image
POST /api/generate-monster-image
Body: { "monsterName": "goblin" }

# Analytics summary
GET /api/analytics/summary?days=30

# Analytics events
GET /api/analytics/events?limit=50
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
