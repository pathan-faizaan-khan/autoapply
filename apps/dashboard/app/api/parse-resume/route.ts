import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No resume text provided" }, { status: 400 });
    }

    const prompt = `You are a world-class resume parser. Perform a HEAVY, DEEP EXTRACTION of the following resume text. Do not leave a single detail behind. Extract everything into a strictly typed JSON object.

Resume Text:
${text}

Return a JSON object with EXACTLY this structure and keys. If a field is not found, use an empty string "" or empty array [].
{
  "personalInfo": { 
    "name": "Full name", 
    "email": "Email address", 
    "phone": "Phone number", 
    "linkedin": "LinkedIn URL", 
    "github": "GitHub URL", 
    "portfolio": "Portfolio or personal website URL",
    "summary": "The candidate's profile summary or objective, extracted fully" 
  },
  "experience": [ 
    { "jobTitle": "Role", "companyName": "Company", "dateRange": "Dates (e.g., Jan 2020 - Present)", "description": "Combine all bullet points and responsibilities into a single comprehensive text paragraph." } 
  ],
  "education": [ 
    { "degree": "Degree earned", "institution": "School or University", "year": "Graduation year or dates", "gpa": "GPA or score if mentioned" } 
  ],
  "skills": ["Skill 1", "Skill 2"],
  "projects": [ 
    { "name": "Project name", "technologies": "Comma-separated tech stack used", "description": "Full description of the project", "link": "Any URL for the project" } 
  ],
  "certifications": [ 
    { "name": "Certificate name", "issuer": "Issuing organization", "date": "Date issued" } 
  ],
  "languages": [ 
    { "name": "Language name", "proficiency": "Fluency level (e.g., Native, Fluent, Beginner)" } 
  ]
}

Rules:
1. Do not hallucinate. Extract only from the provided text.
2. For experience descriptions, combine all bullet points into a dense paragraph. Do not drop any bullet points.
3. Return valid JSON only. No markdown formatting or code blocks outside the JSON string.`;

    const result = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "qwen/qwen3.8-27b",
      response_format: { type: "json_object" },
    });

    const responseText = result.choices[0]?.message?.content || "{}";

    let parsedResult;
    try {
      const cleaned = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      parsedResult = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse Groq response:", responseText);
      return NextResponse.json({ result: responseText });
    }

    return NextResponse.json({ result: parsedResult });

  } catch (error: any) {
    console.error("Groq Parse Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse resume" },
      { status: 500 }
    );
  }
}
