import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 10000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      console.error("Invalid JSON payload");
      return new Response(
        JSON.stringify({ approved: false, reason: "Requête invalide" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { title, content } = body;

    // Validate input types
    if (title !== undefined && typeof title !== 'string') {
      return new Response(
        JSON.stringify({ approved: false, reason: "Le titre doit être du texte" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (content !== undefined && typeof content !== 'string') {
      return new Response(
        JSON.stringify({ approved: false, reason: "Le contenu doit être du texte" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate input lengths
    if (title && title.length > MAX_TITLE_LENGTH) {
      return new Response(
        JSON.stringify({ approved: false, reason: `Le titre ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (content && content.length > MAX_CONTENT_LENGTH) {
      return new Response(
        JSON.stringify({ approved: false, reason: `Le contenu ne peut pas dépasser ${MAX_CONTENT_LENGTH} caractères` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const textToModerate = [title, content].filter(Boolean).join("\n\n");

    if (!textToModerate.trim()) {
      return new Response(
        JSON.stringify({ approved: false, reason: "Contenu vide" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not found");
      // If no API key, approve by default (fallback)
      return new Response(
        JSON.stringify({ approved: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a content moderation AI for a board game marketplace forum. Your job is to detect inappropriate content and ensure a safe community.

REJECT content that contains:
- Hate speech, discrimination, or harassment
- Violent threats or incitement to violence
- Explicit sexual content or pornography
- Illegal activities (drug dealing, weapons sales, fraud, piracy)
- Spam or promotional content unrelated to board games
- Personal information sharing (phone numbers, addresses)
- Scams or phishing attempts
- Severe profanity or vulgar language

APPROVE content that:
- Discusses board games, trading, selling, or buying games
- Asks questions about game rules or recommendations
- Shares opinions about games (even negative ones, if respectful)
- General friendly conversation about the hobby

Respond ONLY with a JSON object in this exact format:
{"approved": true} or {"approved": false, "reason": "Brief explanation in French"}

Be strict about safety but allow normal gaming discussions.`
          },
          {
            role: "user",
            content: `Please moderate this content:\n\n${textToModerate}`
          }
        ],
        max_tokens: 150,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", await response.text());
      // Fallback to approve if AI fails
      return new Response(
        JSON.stringify({ approved: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const messageContent = aiResponse.choices?.[0]?.message?.content || "";

    // Parse the AI response
    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, messageContent);
    }

    // Default to approve if parsing fails
    return new Response(
      JSON.stringify({ approved: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(
      JSON.stringify({ approved: true }), // Fallback to approve
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
