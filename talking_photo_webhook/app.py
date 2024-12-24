from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from Crypto.Cipher import AES
from dotenv import load_dotenv
from flask_socketio import SocketIO, emit
import base64
import json
import time
import os

load_dotenv()

app = Flask(__name__)
# Allow all origins with CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Update SocketIO configuration to allow all origins
socketio = SocketIO(app,
                   cors_allowed_origins="*",
                   ping_timeout=60,
                   ping_interval=25,
                   async_mode='gevent')

# Store events temporarily in memory
events = []

def generate_aes_decrypt(data_encrypt, client_id, client_secret):
    aes_key = client_secret.encode('utf-8')

    # Ensure the IV is 16 bytes long
    iv = client_id.encode('utf-8')
    iv = iv[:16] if len(iv) >= 16 else iv.ljust(16, b'\0')

    cipher = AES.new(aes_key, AES.MODE_CBC, iv)
    decrypted_data = cipher.decrypt(base64.b64decode(data_encrypt))

    # Handle padding
    padding_len = decrypted_data[-1]
    return decrypted_data[:-padding_len].decode('utf-8')

@app.route('/test-app', methods=['GET'])
def test_app():
    #emit socket event
    socketio.emit('message', {'data': 'Hello, World!'})
    return jsonify({"message": "Hello, World!"}), 200

@app.route('/api/webhook', methods=['POST'])
def webhook():
    print("Webhook received")
    # Log the raw request data
    print("Raw request data:", request.get_data())
    data = request.get_json()
    print("JSON data received:", data)  # Add this line to log the incoming JSON

    # Extract the encrypted data and metadata
    encrypted_data = data.get('dataEncrypt')
    client_id = os.getenv('CLIENT_ID')
    client_secret = os.getenv('CLIENT_SECRET')

    try:
        # Decrypt the data
        decrypted_data = generate_aes_decrypt(encrypted_data, client_id, client_secret)
        print("Decrypted Data:", decrypted_data)

        # Process the decrypted data
        try:
            decrypted_json = json.loads(decrypted_data)
            print("Parsed JSON:", decrypted_json)  # Add this line for debugging

            # Check if required fields exist
            if 'status' not in decrypted_json:
                print("Missing 'status' in payload:", decrypted_json)
                return jsonify({"message": "Invalid payload structure - missing video_status"}), 400

            # Log all status updates
            print(f"Processing status {decrypted_json['status']} with full payload:", decrypted_json)

            # Handle different status codes
            if decrypted_json['status'] == 3:
                print("Status is 3, emitting event", decrypted_json)
                socketio.emit('message', {'data': decrypted_json, 'type': 'event'})
            elif decrypted_json['status'] == 4:
                print("Face swap failed")
                socketio.emit('message', {
                    'type': 'error',
                    'message': 'Face swap failed. This could be due to invalid VSideo/Image format, network issues, or processing errors. Please try again or contact support if the issue persists.'
                })
            else:
                print(f"Received status {decrypted_json['status']}, payload:", decrypted_json)
                # Optionally emit other status updates
                socketio.emit('message', {'data': decrypted_json, 'type': 'status_update'})

            return jsonify({
                "message": "Webhook received and processed successfully",
                "decrypted_data": decrypted_json
            }), 200

        except json.JSONDecodeError as je:
            print(f"JSON parsing error: {je}")
            return jsonify({"message": "Invalid JSON format in decrypted data"}), 400

    except Exception as e:
        print(f"Error processing webhook: {e}")
        return jsonify({"message": f"Error processing webhook: {str(e)}"}), 400


@socketio.on('connect')
def handle_connect():
    print("Client connected")
    emit('message', {'data': 'Connected to server', 'type': 'info'})

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=3008)

