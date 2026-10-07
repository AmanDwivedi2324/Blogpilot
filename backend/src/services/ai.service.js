const AI_SERVICE_URL =
    process.env.AI_SERVICE_URL || "http://localhost:8000";

export const generateBlogWithAI = async ({ prompt }) => {
    const response = await fetch(`${AI_SERVICE_URL}/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("Invalid response from AI service");
    }

    if (!response.ok) {
        const error = new Error(
            data?.message || "AI service failed to generate blog"
        );

        error.statusCode = 502;
        throw error;
    }

    return data.data;
};