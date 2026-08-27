import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeData, jobDescription } = body;

    if (!resumeData || !jobDescription) {
      return NextResponse.json({ error: "Missing resumeData or jobDescription" }, { status: 400 });
    }

    const prompt = `You are an expert technical recruiter and AI Job Match Analyzer. 
Perform a deep semantic match between the extracted resume data and the job description.

Resume Data:
${JSON.stringify(resumeData)}

Job Description:
${jobDescription}

Return a JSON object with exactly this structure:
{
  "overallMatchPercentage": 92,
  "skillsMatchScore": 90,
  "experienceMatchScore": 85,
  "educationMatchScore": 100,
  "keywordCoverageScore": 95,
  "hiringRecommendation": "Strong Match" | "Moderate Match" | "Weak Match",
  "skillsMatched": ["Skill1", "Skill2"],
  "missingSkills": ["Skill3", "Skill4"],
  "foundKeywords": ["Keyword1", "Keyword2"],
  "missingKeywords": ["Keyword3", "Keyword4"],
  "strengths": ["Strength1", "Strength2"],
  "weaknesses": ["Weakness1", "Weakness2"],
  "summary": "Professional AI summary of why the candidate is a good or poor match."
}

Rules:
1. All scores (0-100) must be integers based on true semantic meaning, not just exact keyword matching.
2. Hiring Recommendation must be: "Strong Match" (80-100), "Moderate Match" (60-79), or "Weak Match" (Below 60).
3. Extract specific foundKeywords and missingKeywords.
4. Return valid JSON only. No markdown, no code blocks.`;

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
    console.error("Groq Analyze Match Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze match" },
      { status: 500 }
    );
  }
}
