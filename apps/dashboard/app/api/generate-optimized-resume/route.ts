import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  let resumeData: any = null;
  try {
    const body = await req.json();
    resumeData = body.resumeData;
    const { jobDescription, analysisResults } = body;

    const prompt = `
You are an expert Resume Writer and Career Coach.

You are given a candidate's original resume data, a target job description, and the analysis results containing optimization tips and missing keywords.
Your task is to REWRITE and OPTIMIZE the resume to perfectly target the job description, while keeping the information truthful. Do not invent new jobs, degrees, or years of experience. Instead, rephrase bullet points, highlight relevant skills, incorporate missing keywords naturally, and enhance the overall impact.

Original Resume Data:
${JSON.stringify(resumeData, null, 2)}

Target Job Description:
${jobDescription}

Analysis Results & Feedback (Integrate these improvements):
${JSON.stringify(analysisResults, null, 2)}

Return a JSON object representing the newly OPTIMIZED resume. It MUST have the exact same structure as the original resume data:

{
  "name": "string",
  "email": "string",
  "phone": "string",
  "education": ["array of education items (can be objects or strings)"],
  "skills": ["array of skill strings"],
  "languages": ["array of language strings"],
  "experience": ["array of experience items (objects with title, company, dates, description/bullets, or strings)"],
  "projects": ["array of project items (objects or strings)"]
}

Guidelines:
1. Use strong action verbs.
2. Quantify achievements where possible (or keep existing metrics).
3. Naturally insert the "missingKeywords" from the analysis into the skills section, experience bullets, or projects, if plausible based on the candidate's background.
4. Apply the "optimizationTips".
5. Keep the JSON structure perfectly matching the requested schema. Return valid JSON only, no markdown formatting.
`;

    const result = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "qwen/qwen3.8-27b",
      response_format: { type: "json_object" },
    });

    const responseText = result.choices[0]?.message?.content || "{}";

    // Parse the response server-side to ensure clean JSON
    let parsedResult;
    try {
      const cleaned = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      parsedResult = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return NextResponse.json({
        result: responseText,
      });
    }

    return NextResponse.json({
      result: parsedResult,
    });
  } catch (error: any) {
    console.error("Gemini Optimization Error:", error);

    // Fallback for quota exceeded (Demo Mode)
    if (error?.message?.includes("429") || error?.message?.toLowerCase().includes("quota")) {
      const mockResume = resumeData ? { ...resumeData } : {};
      mockResume.name = (mockResume.name || "Candidate") + " [Optimized Demo]";
      if (!mockResume.skills) mockResume.skills = [];
      mockResume.skills.push("Next.js (Added by AI)");
      return NextResponse.json({
        result: mockResume
      });
    }

    return NextResponse.json(
      { error: error?.message || "Resume optimization failed" },
      { status: 500 }
    );
  }
}
