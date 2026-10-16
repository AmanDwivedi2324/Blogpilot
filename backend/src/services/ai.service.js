
const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://localhost:8000";

export const generateBlogWithAI = async ({ prompt }) => {
  let response;

  try {
    response = await fetch(`${AI_SERVICE_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });
  } catch (err) {
    console.error("AI service connection failed:", err.message);

    const error = new Error(
      "Cannot connect to the AI service. Check whether FastAPI is running."
    );
    error.statusCode = 502;
    throw error;
  }

  let data;

  try {
    data = await response.json();
  } catch {
    console.error("AI service returned a non-JSON response.");

    const error = new Error("AI service returned an invalid response.");
    error.statusCode = 502;
    throw error;
  }

  if (!response.ok) {
    // Log the actual FastAPI error for debugging.
    console.error("AI service request failed:", {
      status: response.status,
      response: data,
    });

    const error = new Error(
      data?.detail ||
      data?.message ||
      data?.error ||
      `AI service returned HTTP ${response.status}`
    );

    error.statusCode = 502;
    throw error;
  }

  const result = data?.data ?? data;

  if (!result?.content) {
    console.error("Unexpected AI service response structure:", data);

    const error = new Error(
      "AI service responded successfully but returned no blog content."
    );
    error.statusCode = 502;
    throw error;
  }

  return result;
};
