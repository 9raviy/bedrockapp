// Update the endpoint to your deployed API Gateway or Lambda URL
const LAMBDA_ENDPOINT =
  "https://zshqigqvtd.execute-api.us-west-2.amazonaws.com/prod/quiz";

export async function getNextQuestion(payload) {
  const res = await fetch(LAMBDA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  // If using API Gateway, you may need to parse data.body
  return typeof data.body === "string"
    ? JSON.parse(data.body)
    : data.body || data;
}
