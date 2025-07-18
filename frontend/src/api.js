// Update the endpoint to your deployed API Gateway or Lambda URL
const LAMBDA_ENDPOINT = "https://rcii39xu38.execute-api.us-west-2.amazonaws.com/prod/quiz";

export async function getNextQuestion(payload) {
  try {
    const res = await fetch(LAMBDA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    // If using API Gateway, you may need to parse data.body
    return typeof data.body === "string"
      ? JSON.parse(data.body)
      : data.body || data;
  } catch (error) {
    console.error("Error calling API:", error);
    throw error;
  }
}
