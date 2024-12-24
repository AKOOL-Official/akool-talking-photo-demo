import { useState, useEffect, useRef } from 'react'
import './App.css'
import io from 'socket.io-client'

interface Voice {
  voice_id: string;
  id: string;
  name: string;
  gender: string;
  accent?: string;
  description?: string;
}


function App() {
  const [apiToken, setApiToken] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('https://i.ibb.co/gRX4tFs/art-74050-1920.jpg')
  const [prompt, setPrompt] = useState('')
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedGender, setSelectedGender] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('')
  const [socket, setSocket] = useState(io('http://localhost:3008'))
  const [showProcessingPopup, setShowProcessingPopup] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [rate] = useState("100%")
  const [isConnected, setIsConnected] = useState(false)
  const [videoPopupUrl, setVideoPopupUrl] = useState<string>('');
  const [charCount, setCharCount] = useState(0)
  const [authTab, setAuthTab] = useState('token') // 'token' or 'client'
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      fetchVoices()
    }
  }, [isAuthenticated])

  useEffect(()=>{
    socket.current = io('http://localhost:3008', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    socket.current.on("connect", () => {
      console.log("Connected to WebSocket server");
      setIsConnected(true);
    });
    
    socket.current.on("message", async (msg) => {
      if (msg.type === 'event') {
        if (msg.data.type === 'audio') {
          // If it's audio type, make the API call for video creation
          try {
            const payload = {
              talking_photo_url: photoUrl, // The image URL from user input
              audio_url: msg.data.url, // The audio URL from the event
              webhookUrl: "https://297a-219-91-134-123.ngrok-free.app/api/webhook"
            };

            const response = await fetch('https://openapi.akool.com/api/open/v3/content/video/createbytalkingphoto', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

            if (!response.ok) {
              throw new Error('Failed to create video');
            }

            // Keep showing processing popup while waiting for final video
            setShowProcessingPopup(true);

          } catch (error) {
            console.error('Error creating video:', error);
            setErrorMessage('Failed to create video');
            setShowErrorPopup(true);
            setShowProcessingPopup(false);
          }
        } else {
          // If it's not audio type (i.e., final video)
          const videoUrl = msg.data.url;
          setVideoPopupUrl(videoUrl); // Set the video URL to show in popup
          setShowProcessingPopup(false);
        }
      } else if (msg.type === 'error') {
        // Handle error message
        setShowProcessingPopup(false);
        setErrorMessage(msg.message);
        setShowErrorPopup(true);
      }
    });

    socket.current.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setErrorMessage("Failed to connect to server");
      setIsConnected(false);
    });

    socket.current.on("disconnect", (reason) => {
      console.log("Disconnected from server:", reason);
      setIsConnected(false);
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    }
  }, [apiToken, photoUrl]);

  useEffect(() => {
    if (selectedVoice) {
      const selectedVoiceDetails = voices.find(voice => voice.voice_id === selectedVoice);
      console.log('Selected Voice Details:', selectedVoiceDetails);
    }
  }, [selectedVoice, voices]);

  const fetchVoices = async () => {
    try {
      const response = await fetch('https://openapi.akool.com/api/open/v3/voice/list?from=3', {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      const data = await response.json();
      setVoices(data.data || []);
    } catch (error) {
      console.error('Error fetching voices:', error);
    }
  }

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (authTab === 'token') {
      if (apiToken.trim()) {
        setIsAuthenticated(true)
      }
    } else {
      // Handle client credentials flow
      if (clientId.trim() && clientSecret.trim()) {
        try {
          const response = await fetch('https://openapi.akool.com/api/open/v3/getToken', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              clientId: clientId,
              clientSecret: clientSecret
            })
          });

          const data = await response.json();
          if (data.token) {
            setApiToken(data.token);
            setIsAuthenticated(true);
          } else {
            setErrorMessage('Invalid credentials');
            setShowErrorPopup(true);
          }
        } catch (error) {
          setErrorMessage('Failed to authenticate');
          setShowErrorPopup(true);
        }
      }
    }
  }

  // Get unique genders from voices
  const genders = [...new Set(voices.map(voice => voice.gender))];
  
  // Filter voices by selected gender
  const filteredVoices = voices.filter(voice => voice.gender === selectedGender);

  const handleAnimatePhoto = async () => {
    // Validate inputs
    if (!photoUrl || !prompt || !selectedVoice) {
      setErrorMessage("Please fill in all fields");
      setShowErrorPopup(true);
      return;
    }

    try {
      // Create the payload for the API call
      const payload = {
        input_text: prompt,
        voice_id: selectedVoice,
        rate: rate,
        webhookUrl: "https://297a-219-91-134-123.ngrok-free.app/api/webhook"
      };

      // Make the API call
      const response = await fetch('https://openapi.akool.com/api/open/v3/audio/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create audio');
      }

      // Show processing popup
      setShowProcessingPopup(true);

      // Store the photo URL and other data if needed
      // You can add additional state variables to store this information
      localStorage.setItem('lastPhotoUrl', photoUrl);
      localStorage.setItem('lastPrompt', prompt);
      localStorage.setItem('lastVoiceId', selectedVoice);

    } catch (error) {
      console.error('Error creating audio:', error);
      setErrorMessage(error.message || 'Failed to create audio');
      setShowErrorPopup(true);
    }
  };

  return (
    <div className="container">
      {!isAuthenticated ? (
        <div className="auth-section">
          <div className="glowing-circle"></div>
          <img 
            src="/images/4p6vr8j7vbom4axo7k0 2.png" 
            alt="Logo" 
            className="logo"
          />
          <h1 className="title">AI Photo Animator</h1>
          
          <div className="auth-tabs">
            <button 
              className={`tab-btn ${authTab === 'token' ? 'active' : ''}`}
              onClick={() => setAuthTab('token')}
            >
              Enter Token
            </button>
            <button 
              className={`tab-btn ${authTab === 'client' ? 'active' : ''}`}
              onClick={() => setAuthTab('client')}
            >
              Client Details
            </button>
          </div>

          <form onSubmit={handleTokenSubmit}>
            {authTab === 'token' ? (
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter your API token"
                className="input-field"
              />
            ) : (
              <>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Enter Client ID"
                  className="input-field"
                />
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Enter Client Secret"
                  className="input-field"
                />
              </>
            )}
            <button type="submit" className="submit-btn">
              Get Started
            </button>
          </form>
        </div>
      ) : (
        <div className="photo-section">
          <img 
            src="/images/4p6vr8j7vbom4axo7k0 2.png" 
            alt="Logo" 
            className="logo"
          />
          <h2 className="subtitle">Create Your Talking Photo</h2>
          <div className="input-container">
            <div className="url-input-container">
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Enter photo URL"
                className="input-field"
              />
              {photoUrl && (
                <div className="preview-button-container">
                  <span className="preview-button">
                    Preview
                  </span>
                  <div className="preview-hover">
                    <img 
                      src={photoUrl} 
                      alt="Preview" 
                      className="preview-image"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Gender Selection Dropdown */}
            <select
              value={selectedGender}
              onChange={(e) => {
                setSelectedGender(e.target.value);
                setSelectedVoice(''); // Reset voice selection when gender changes
              }}
              className="input-field"
            >
              <option value="">Select Gender</option>
              {genders.map(gender => (
                <option key={gender} value={gender}>
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </option>
              ))}
            </select>

            {/* Voice Selection Dropdown */}
            <select
              value={selectedVoice}
              onChange={(e) => {
                setSelectedVoice(e.target.value);
                const selectedVoiceDetails = voices.find(voice => voice.voice_id === e.target.value);
                console.log('Selected Voice Details:', selectedVoiceDetails);
              }}
              className="input-field"
              disabled={!selectedGender}
            >
              <option value="">Select Voice</option>
              {filteredVoices.map(voice => (
                <option key={voice.voice_id} value={voice.voice_id}>
                  {voice.name}
                  {voice.accent ? ` (${voice.accent})` : ''} 
                  {voice.description ? ` - ${voice.description}` : ''}
                </option>
              ))}
            </select>

            <div className="textarea-container">
              <textarea
                value={prompt}
                onChange={(e) => {
                  const text = e.target.value;
                  if (text.length <= 1000) {
                    setPrompt(text);
                    setCharCount(text.length);
                  }
                }}
                placeholder="What should your photo say?"
                className="input-field textarea"
                maxLength={1000}
              />
              <div className="char-counter">
                {charCount}/1000 characters
              </div>
            </div>

            <button 
              className="submit-btn" 
              onClick={handleAnimatePhoto}
            >
              Animate Photo
            </button>
          </div>
        </div>
      )}
      {showProcessingPopup && (
        <div className="processing-popup">
          <div className="processing-content">
            <div className="loader"></div>
            <h3 className="processing-message">
              Creating Your Talking Photo
            </h3>
            <p className="processing-submessage">
              We're working our magic to bring your photo to life! ✨
            </p>
          </div>
        </div>
      )}

      {showErrorPopup && (
        <div className="popup">
          <div className="popup-content">
            <p>{errorMessage}</p>
            <button onClick={() => setShowErrorPopup(false)}>Close</button>
          </div>
        </div>
      )}
      {!isConnected && (
        <div className="connection-warning">
          Warning: Not connected to server
        </div>
      )}
      {videoPopupUrl && (
        <div className="video-popup">
          <div className="video-popup-content">
            <button 
              className="close-button"
              onClick={() => setVideoPopupUrl('')}
            >
              ×
            </button>
            <div className="video-container">
              <video 
                className="video-player"
                controls
                autoPlay
                src={videoPopupUrl}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <button 
              className="download-button"
              onClick={() => {
                const link = document.createElement('a');
                link.href = videoPopupUrl;
                link.download = 'animated-photo.mp4';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              Download Video
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
