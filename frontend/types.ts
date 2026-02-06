export type ParsedResume = {
    skills: string[];
    experience: string[];
    education: string[];
    summary: string;
};

// ==================== ANALYSIS REPORT TYPES ====================
export type SpeechAnalysis = {
    pace: string;
    clarity: number;
    conciseness: number;
    stammering_frequency: string;
    filled_pauses_count: number;
    long_pauses_count: number;
};

export type ContentAnalysis = {
    technical_accuracy: number;
    relevance: number;
    problem_solving_skills: number;
    key_strengths: string[];
    areas_for_improvement: string[];
};

export type QuestionFeedback = {
    question_text: string;
    user_response_summary: string;
    score: number;
    feedback: string;
    better_response_suggestion: string;
};

export type InterviewAnalysisReport = {
    overall_score: number;
    summary: string;
    speech_analysis: SpeechAnalysis;
    content_analysis: ContentAnalysis;
    question_breakdown: QuestionFeedback[];
    actionable_tips: string[];
    final_verdict: string;
};
