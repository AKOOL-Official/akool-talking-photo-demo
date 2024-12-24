# Talking Photo Application

This project involves the development of a talking photo application featuring a React frontend and a Flask backend. The application enables users to animate photos, allowing them to generate synchronized lip movements and audio based on text input. Users can type text, which is converted into audio, and the photo is animated to appear as though it is speaking the provided text.

## Frontend Setup

### Prerequisites
- Node Version Manager (nvm)
- Node.js v20
- npm or yarn

### Installation & Setup
1. Install Node.js v20 using nvm:
   ```bash
   nvm install 20
   nvm use 20
   ```

2. Navigate to the frontend directory:
   ```bash
   cd talking-photo-frontend
   ```

3. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

The frontend will be available at `http://localhost:5173`

### Configuration
You'll need to update the webhook URLs in `src/App.tsx`. Search for URLs containing `ngrok-free.app` and replace them with your ngrok forwarding URL. For example:

Change:
```typescript
webhookUrl: "https://c184-219-91-134-123.ngrok-free.app/api/webhook"
```
to:
```typescript
webhookUrl: "https://your-ngrok-url.ngrok-free.app/api/webhook"
```

## Backend Setup

### Prerequisites
- Python 3.x
- pip
- Virtual environment (recommended)

### Installation & Setup
1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Navigate to the backend directory:
   ```bash
   cd talking_photo_webhook
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with your credentials:
   ```env
   CLIENT_ID=your_client_id
   CLIENT_SECRET=your_client_secret
   ```

5. Start the Flask server:
   ```bash
   python app.py
   ```

The backend will be available at `http://localhost:3008`

## Setting up ngrok

ngrok is required to create a public URL for your local webhook endpoint.

1. Install ngrok:
   - Download from ngrok website
   - Sign up for a free account
   - Follow the installation instructions for your OS

2. Authenticate ngrok:
   ```bash
   ngrok config add-authtoken your_auth_token
   ```

3. Start ngrok to forward your backend port:
   ```bash
   ngrok http 3008
   ```

Copy the forwarding URL (e.g., `https://your-ngrok-url.ngrok-free.app`) and update it in the frontend code as described in the Frontend Configuration section.

## Important Notes
- Make sure both frontend and backend servers are running simultaneously
- The ngrok URL changes every time you restart ngrok (unless you have a paid plan)
- Update the webhook URLs in the frontend whenever you get a new ngrok URL
- Keep your `CLIENT_ID` and `CLIENT_SECRET` secure and never commit them to version control

## Troubleshooting
- If you encounter CORS issues, ensure the backend CORS settings are properly configured
- If the websocket connection fails, check that your ports aren't blocked by a firewall
- For ngrok connection issues, ensure your authtoken is properly configured
