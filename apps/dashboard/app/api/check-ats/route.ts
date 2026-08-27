import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeData } = body;

    if (!resumeData) {
      return NextResponse.json({ error: "Missing resumeData" }, { status: 400 });
    }

    const prompt = `You are an expert ATS (Applicant Tracking System) Analyzer.
Perform a comprehensive ATS compatibility check on this resume data.

Resume Data:
${JSON.stringify(resumeData)}

Return a JSON object with exactly this structure:
{
  "atsScore": 78,
  "radarData": [
    { "subject": "Skills", "A": 90, "fullMark": 100 },
    { "subject": "Experience", "A": 85, "fullMark": 100 },
    { "subject": "Education", "A": 100, "fullMark": 100 },
    { "subject": "Keywords", "A": 75, "fullMark": 100 },
    { "subject": "Formatting", "A": 95, "fullMark": 100 },
    { "subject": "ATS Compliance", "A": 80, "fullMark": 100 }
  ],
  "sectionScores": {
    "Contact Information": 100,
    "Resume Structure": 85,
    "Skills Section": 90,
    "Experience Section": 85,
    "Education Section": 100,
    "Keyword Density": 75,
    "Formatting Quality": 95
  },
  "suggestions": ["Suggestion1", "Suggestion2"]
}

Rules:
1. atsScore must be an integer from 0-100.
2. radarData array MUST contain EXACTLY those 6 subjects with their calculated scores (A).
3. sectionScores must contain those exact 7 keys with integer scores (0-100).
4. Provide highly actionable suggestions to improve the ATS score.
5. Return valid JSON only. No markdown, no code blocks.`;

    const result = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "qwen/qwen3.8-27b",
      response_format: { type: "json_object" },
    });

    const responseText = result.choices[0]?.message?.content || "{}";

    let parsedResult;
    try {
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse Groq response:", responseText);
      return NextResponse.json({ result: responseText });
    }

    return NextResponse.json({ result: parsedResult });

  } catch (error: any) {
    console.error("Groq ATS Check Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check ATS" },
      { status: 500 }
    );
  }
}
