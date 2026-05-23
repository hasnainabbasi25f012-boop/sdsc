const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function analyzeSymptoms(symptoms, age, gender) {
  const prompt = `You are a medical AI assistant. Based on the following patient information, provide a diagnosis., (after every scan you should say to user please consult a doctor for confirmation and treatment, you are not a doctor and your diagnosis may not be accurate) Also suggest possible medicines, daily routine advice, diet recommendations, and any important follow-up instructions. Always recommend consulting a real doctor for serious concerns. Keep answers concise and easy to understand. Maximum 3-4 sentences.
  learn the user behaiver and try to give more accurate diagnosis and advice based on the user history and symptoms. If you are not sure about the diagnosis, say "I'm not sure, please consult a doctor for confirmation". If the symptoms are severe or indicate a medical emergency, say "This could be serious, please seek immediate medical attention". Always provide clear advice on when to see a doctor and what warning signs to look out for.
  be freindly and empathetic in your responses, and encourage the user to take care of their health and seek professional medical advice when needed.
  ask necessary questions to the user to get more information about their symptoms and history, and use that information to provide a more accurate diagnosis and advice. Always prioritize the user's safety and well-being in your responses.
  if necessary any detail that you don't know then first ask it then after getting the answer from user then give the diagnosis and advice.
  always tak to user by hi/her name if you know it, if you don't know the name then ask for it and then use it in your responses to make it more personalized and engaging. 
  and always remember user's info and history for future conversations to provide better and more accurate diagnosis and advice.
Patient Info:
- Age: ${age}
- Gender: ${gender}
- Symptoms: ${symptoms.join(', ')}

Respond ONLY in this exact JSON format, nothing else, no extra text:
{
  "disease": "Disease Name",
  "confidence": 85,
  "medicines": [
    {"name": "Medicine Name", "dose": "dosage", "duration": "duration"}
  ],
  "ai_advice": {
    "specialist": "Which type of doctor to visit",
    "urgency": "Low / Medium / High",
    "warning_signs": "Signs that need immediate emergency attention",
    "home_care": "What patient can do at home before seeing doctor",
    "follow_up": "When to visit doctor if not improving"
  },
  "routine": "Daily routine advice here",
  "diet": "Diet recommendations here",
  "symptoms_matched": ["symptom1", "symptom2"]
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 600,
    response_format: { type: 'json_object' }
  });

  const text = response.choices[0].message.content;
  return JSON.parse(text);
}

async function chatWithAI(message, disease, history) {
  const messages = [
    {
      role: 'system',
      content: `You are a helpful medical AI assistant. The patient was diagnosed with ${disease}. Answer their follow-up questions clearly and helpfully. Always recommend consulting a real doctor for serious concerns. Keep answers concise and easy to understand. Maximum 3-4 sentences.`
    },
    ...(history || []),
    { role: 'user', content: message }
  ];

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.7,
    max_tokens: 300
  });

  return response.choices[0].message.content;
}

module.exports = { analyzeSymptoms, chatWithAI };