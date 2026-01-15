# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up environment variables for OpenAI image generation (optional)
# Create a .env file in the project root with:
# OPENAI_API_KEY=your_openai_api_key_here
# API_PORT=3001

# Step 5: Start the development servers
# Option A: Start both frontend and API server together
npm run dev:all

# Option B: Start them separately (in two terminals)
# Terminal 1: Frontend
npm run dev

# Terminal 2: API server (required for OpenAI image generation)
npm run dev:api
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Express (API server for OpenAI image generation)
- OpenAI DALL-E 3 (for generating monster images)

## Features

- **Monster Card Generator**: Create printable D&D monster cards from the Open5e API
- **Monster Image Integration**: Automatically includes official Monster Manual artwork when available
- **AI Image Generation**: Generates missing monster images using OpenAI DALL-E 3 when not found in the database
- **Print Preview**: Preview cards before printing with proper A4 landscape layout
- **PDF Export**: Export cards as PDF for easy printing

## Image Sources

Monster images are sourced from:
1. **Scraped from Forgotten Realms Wiki**: Official Monster Manual 5e images (289 monsters)
2. **OpenAI DALL-E 3**: Generated images for monsters not found in the database

To update the image database, run:
```sh
npm run scrape-images
```

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
