import { ParsedResume } from "@/types";

export function parseResumeText(text: string): ParsedResume {
    const lines = text.split("\n").filter((line) => line.trim());
    const skills: string[] = [];
    const experience: string[] = [];
    const education: string[] = [];
    let summary = "";

    // Simple heuristic parsing with expanded keywords
    let currentSection = "";

    for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();

        // Detect section headers (more keywords)
        if (
            lowerLine.includes("skill") ||
            lowerLine.includes("technologies") ||
            lowerLine.includes("tools") ||
            lowerLine.includes("technical") ||
            lowerLine.includes("competencies") ||
            lowerLine.includes("proficiencies")
        ) {
            currentSection = "skills";
            continue;
        } else if (
            lowerLine.includes("experience") ||
            lowerLine.includes("work history") ||
            lowerLine.includes("employment") ||
            lowerLine.includes("project") ||
            lowerLine.includes("professional")
        ) {
            currentSection = "experience";
            continue;
        } else if (
            lowerLine.includes("education") ||
            lowerLine.includes("academic") ||
            lowerLine.includes("degree") ||
            lowerLine.includes("university") ||
            lowerLine.includes("college") ||
            lowerLine.includes("certification") ||
            lowerLine.includes("course")
        ) {
            currentSection = "education";
            continue;
        } else if (
            lowerLine.includes("summary") ||
            lowerLine.includes("objective") ||
            lowerLine.includes("profile") ||
            lowerLine.includes("about")
        ) {
            currentSection = "summary";
            continue;
        }

        // Extract skills (comma or pipe separated, or bullet points)
        if (currentSection === "skills") {
            const skillMatches = line
                .split(/[,|•·\-]/g)
                .map((s) => s.trim())
                .filter((s) => s.length > 1 && s.length < 35);
            skills.push(...skillMatches);
        } else if (currentSection === "experience" && line.trim().length > 10) {
            experience.push(line.trim());
        } else if (currentSection === "education" && line.trim().length > 10) {
            education.push(line.trim());
        } else if (currentSection === "summary") {
            summary += line + " ";
        }
    }

    // If no skills found, try to extract common tech keywords from the full text
    if (skills.length === 0) {
        const techKeywords = [
            "Python",
            "JavaScript",
            "TypeScript",
            "React",
            "Node.js",
            "SQL",
            "AWS",
            "Docker",
            "Git",
            "Java",
            "C++",
            "Go",
            "Kubernetes",
            "MongoDB",
            "PostgreSQL",
            "REST",
            "GraphQL",
            "CI/CD",
            "Agile",
            "Scrum",
            "Flask",
            "Django",
            "FastAPI",
            "Next.js",
            "Vue",
            "Angular",
            "Machine Learning",
            "AI",
            "TensorFlow",
            "PyTorch",
            "HTML",
            "CSS",
            "Linux",
            "Azure",
            "GCP",
            "Redis",
            "Kafka",
            "Microservices",
        ];
        for (const keyword of techKeywords) {
            if (
                text.includes(keyword) ||
                text.toLowerCase().includes(keyword.toLowerCase())
            ) {
                skills.push(keyword);
            }
        }
    }

    // If no experience found, extract lines that look like job entries
    if (experience.length === 0) {
        for (const line of lines) {
            if (
                (line.includes("20") && line.length > 20) || // Contains year like 2020, 2021, etc.
                line.includes("•") ||
                (line.includes("-") && line.length > 30)
            ) {
                experience.push(line.trim());
                if (experience.length >= 5) break;
            }
        }
    }

    return {
        skills: skills.slice(0, 15),
        experience: experience.slice(0, 5),
        education: education.slice(0, 3),
        summary: summary.trim().slice(0, 300),
    };
}
