import os
import json
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_file
from google import genai
from google.genai import types
import requests
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# --- API Keys & Clients Configuration ---
GEMINI_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
# Do not hardcode a fallback key here! Leave an error or warning instead.
if not GEMINI_KEY:
    print("Warning: GEMINI_API_KEY is not set!")

client = genai.Client(api_key=GEMINI_KEY)

# --- ElevenLabs Voice Configuration ---
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
# Verified pre-made stable voice ID (Bella) that functions perfectly on standard free tiers
ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/decompose-task', methods=['POST'])
def decompose_task():
    data = request.json
    user_goal = data.get('goal', '')
    deadline_str = data.get('deadline', '')

    if not user_goal or not deadline_str:
        return jsonify({"error": "Goal and Deadline are required!"}), 400

    today = datetime.now()
    today_formatted = today.strftime("%B %d, %Y")

    system_instruction = (
        "You are ChronosAgent, an advanced AI macro-productivity scheduling assistant. "
        "Your task is to take a massive user goal, look at the timeline gap between today's current date "
        "and the final target deadline, and break down a strategic chronological timeline map. "
        "You must output ONLY raw, unformatted valid JSON. Do not write markdown blocks like ```json."
    )

    prompt = f"""
    Today's current date is: {today_formatted}.
    The user's absolute objective is: '{user_goal}'.
    The user's final deadline target is: '{deadline_str}'.
    
    Instructions:
    1. Calculate the total weeks/months window available between today's date and the final target deadline.
    2. Group this long-term strategy timeline into balanced, progressive weekly sprints or phases.
    
    Provide the response strictly in this structural JSON array format:
    [
      {{"day": "Week 1", "task_name": "Milestone strategy block summary.", "priority": "High/Medium/Low"}},
      {{"day": "Week 2", "task_name": "Next progressive execution segment block.", "priority": "High/Medium/Low"}}
    ]
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
            )
        )
        
        response_text = response.text.strip()
        tasks_json = json.loads(response_text)
        return jsonify({"status": "success", "schedule": tasks_json})
    except Exception as e:
        print(f"--- Decompose Task Error: {str(e)} ---")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/voice-assistant', methods=['POST'])
def voice_assistant():
    data = request.json
    user_query = data.get('query', '')

    if not user_query:
        return jsonify({"error": "Query cannot be empty"}), 400

    ta_instruction = (
        "You are TA, the intelligent voice companion for the Target Achiever platform. "
        "Your job is to answer user questions, explain topics, and help solve problems. "
        "CRITICAL: Keep your answers incredibly brief, clean, and direct (max 1-2 short sentences). "
        "Do not use markdown text styling, bullet points, asterisks, symbols, or long blocks. "
        "Speak naturally like a supportive, brilliant academic tutor."
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_query,
            config=types.GenerateContentConfig(
                system_instruction=ta_instruction,
                temperature=0.4,
            )
        )
        return jsonify({"status": "success", "reply": response.text.strip()})
    except Exception as e:
        print(f"--- Gemini Voice Assistant Route Error: {str(e)} ---")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/tts', methods=['POST'])
def text_to_speech():
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
        
    # Clean the voice ID variable to guarantee no hidden bracket wrappers remain
    clean_voice_id = str(ELEVENLABS_VOICE_ID).replace('[', '').replace(']', '').strip()
    
    # Absolute clean base URL string construction
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{clean_voice_id}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY.strip()
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2", 
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            return send_file(BytesIO(response.content), mimetype="audio/mpeg")
        else:
            print(f"ElevenLabs API Error Log: {response.text}")
            return jsonify({"error": f"ElevenLabs API Error: {response.text}"}), response.status_code
    except Exception as e:
        print(f"Server Route Exception: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)