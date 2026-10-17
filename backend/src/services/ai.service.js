
const AI_SERVICE_URL = (
  process.env.AI_SERVICE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

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
      "Cannot connect to the AI service. Check AI_SERVICE_URL and service availability."
    );
    error.statusCode = 502;
    throw error;
  }

  // Read the response as text first so non-JSON errors are visible.
  const responseText = await response.text();

  console.log("AI service URL:", AI_SERVICE_URL);
  console.log("AI service HTTP status:", response.status);
  console.log(
    "AI service content type:",
    response.headers.get("content-type")
  );
  console.log(
    "AI service response preview:",
    responseText.slice(0, 1000)
  );

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    console.error("AI service returned a non-JSON response.");

    const error = new Error(
      `AI service returned a non-JSON response (HTTP ${response.status}).`
    );
    error.statusCode = 502;
    throw error;
  }

  if (!response.ok) {
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
