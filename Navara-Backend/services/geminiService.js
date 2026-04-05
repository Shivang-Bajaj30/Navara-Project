const { GoogleGenAI } = require('@google/genai');

class GeminiService {
  constructor() {
    this.ai = null;
    this.model = 'gemini-2.5-flash';
  }

  /**
   * Initialize the Gemini client (lazy init to avoid crash if no API key)
   */
  _getClient() {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in environment variables. Get one at https://aistudio.google.com/apikey');
      }
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  /**
   * Analyze route accessibility using Gemini AI
   * @param {Object} routeData - Route info (distance, duration, steps, geometry)
   * @param {Object} accessibilitySummary - Summarized accessibility data from AccessibilityService
   * @param {Object} userNeeds - User's accessibility requirements
   * @returns {Promise<Object>} Structured accessibility analysis
   */
  async analyzeRouteAccessibility(routeData, accessibilitySummary, userNeeds) {
    try {
      const client = this._getClient();

      const prompt = this._buildPrompt(routeData, accessibilitySummary, userNeeds);

      const response = await client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3 // Low temperature for consistent structured output
        }
      });

      const rawText = response.text;

      try {
        const analysis = JSON.parse(rawText);
        return analysis;
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from the response
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        // Return raw text wrapped in a structure
        return {
          overallScore: 50,
          summary: rawText,
          hazards: [],
          recommendations: [],
          segmentAnalysis: [],
          error: 'AI response was not in expected JSON format'
        };
      }
    } catch (error) {
      console.error('Gemini analysis error:', error.message);
      throw new Error(`AI accessibility analysis failed: ${error.message}`);
    }
  }

  /**
   * Build the structured prompt for Gemini
   */
  _buildPrompt(routeData, accessibilitySummary, userNeeds) {
    const needsList = [];
    if (userNeeds.wheelchair) needsList.push('wheelchair user');
    if (userNeeds.visualImpairment) needsList.push('visual impairment');
    if (userNeeds.hearingImpairment) needsList.push('hearing impairment');
    if (userNeeds.avoidStairs) needsList.push('must avoid stairs');
    if (userNeeds.avoidSteepSlopes) needsList.push('must avoid steep slopes (>6%)');
    if (userNeeds.preferSmooth) needsList.push('needs smooth surfaces (no cobblestone/gravel)');
    if (userNeeds.needsCurbCuts) needsList.push('requires lowered curbs/curb cuts at crossings');
    if (userNeeds.mobilityAid) needsList.push(`uses mobility aid: ${userNeeds.mobilityAid}`);
    if (userNeeds.minPathWidth) needsList.push(`minimum path width: ${userNeeds.minPathWidth}m`);

    return `You are an expert accessibility consultant analyzing a walking route for a person with disabilities.

## User's Accessibility Needs
${needsList.length > 0 ? needsList.map(n => `- ${n}`).join('\n') : '- General accessibility assessment'}

## Route Information
- Distance: ${routeData.distance}
- Duration: ${routeData.duration}
- Number of route steps/turns: ${routeData.stepsCount || 'unknown'}

## OpenStreetMap Accessibility Data Along Route Corridor
${JSON.stringify(accessibilitySummary, null, 2)}

## Your Task
Analyze this route for the user's specific accessibility needs and provide a detailed assessment.

Respond with ONLY a JSON object in this EXACT format:
{
  "overallScore": <number 0-100, where 100 is perfectly accessible>,
  "riskLevel": "<low|moderate|high|critical>",
  "summary": "<2-3 sentence overall assessment>",
  "hazards": [
    {
      "type": "<barrier|surface|slope|width|curb|stairs|other>",
      "severity": "<low|medium|high|critical>",
      "description": "<specific description of the hazard>",
      "suggestion": "<how to navigate or avoid this hazard>"
    }
  ],
  "positiveFeatures": [
    "<positive accessibility features found along the route>"
  ],
  "surfaceAnalysis": {
    "summary": "<brief surface quality assessment>",
    "wheelchairFriendly": <boolean>,
    "dominantSurface": "<most common surface type>"
  },
  "recommendations": [
    "<specific actionable recommendations for the user>"
  ],
  "alternativeAdvice": "<advice about seeking alternative routes if this one is problematic, or null if route is fine>",
  "estimatedAccessibleDuration": "<estimated time considering accessibility needs, e.g. '35 minutes' - typically 1.3-2x walking time for wheelchair users>",
  "safetyTips": [
    "<safety tips specific to this user's needs>"
  ]
}`;
  }
}

module.exports = new GeminiService();
