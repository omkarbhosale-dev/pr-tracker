const OpenAI = require("openai");

let _client = null;

function getOpenRouterClient() {
  if (!_client) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }

    _client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": "https://github-pr-assistant.local",
        "X-Title": process.env.OPENROUTER_APP_NAME || "GitHub PR Assistant",
      },
    });
  }
  return _client;
}

/**
 * Call the OpenRouter AI model with a system + user prompt.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {object} options
 * @param {number} options.maxTokens
 * @param {number} options.temperature
 * @returns {Promise<string>} AI response text
 */
async function callAI(systemPrompt, userPrompt, options = {}) {
  const client = getOpenRouterClient();
  const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324:free";

  const { maxTokens = 2048, temperature = 0.3 } = options;

  console.log(`🤖 Calling OpenRouter model: ${model}`);

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const text = response.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Empty response from AI model");
  }

  console.log(`✅ AI responded (${text.length} chars, finish_reason=${response.choices[0].finish_reason})`);
  return text;
}

/**
 * Parse a JSON block from the AI response.
 * The AI is instructed to wrap JSON in ```json ... ``` fences.
 *
 * @param {string} text
 * @returns {object|null}
 */
function parseJSONFromAI(text) {
  // Try fenced block first
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (_) {}
  }

  // Try raw JSON (the whole response)
  try {
    return JSON.parse(text.trim());
  } catch (_) {}

  return null;
}

module.exports = { callAI, parseJSONFromAI };
