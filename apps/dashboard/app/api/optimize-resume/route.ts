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

    const prompt = `You are an elite Resume Optimizer and Career Coach.
Rewrite and optimize the resume data to perfectly align with the job description.

Resume Data:
${JSON.stringify(resumeData)}

Job Description:
${jobDescription}

Return a JSON object with exactly this structure:
{
  "optimizedResume": {
    "name": "Candidate Name",
    "email": "email",
    "phone": "phone",
    "summary": "Optimized professional summary",
    "skills": ["Skill1", "Skill2"],
    "education": ["Education details"],
    "experience": [
      {
        "title": "Job Title",
        "company": "Company",
        "dates": "Dates",
        "bullets": ["Optimized achievement bullet 1", "Optimized achievement bullet 2"]
      }
    ],
    "projects": ["Project details"]
  },
  "comparisons": {
    "experience": [
      {
        "original": "Original raw bullet point from resume data",
        "optimized": "Optimized achievement bullet point (e.g. Managed X to achieve Y...)"
      }
    ]
  },
  "addedKeywords": ["Keyword1", "Keyword2"],
  "charts": {
    "skillsScore": { "before": 60, "after": 95 },
    "keywordCoverage": { "before": 40, "after": 85 },
    "atsScore": { "before": 50, "after": 90 }
  }
}

Rules:
1. 'optimizedResume' must contain a fully structured, ready-to-use resume profile. Ensure you parse their original experience strings into title, company, dates, and bullets. If you can't parse perfectly, do your best.
2. Experience bullets MUST be achievement-based and include metrics where possible.
3. 'comparisons.experience' must show 2-3 examples of a poor original bullet transformed into a great one.
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
    console.error("Groq Resume Optimization Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to optimize resume" },
      { status: 500 }
    );
  }
}
