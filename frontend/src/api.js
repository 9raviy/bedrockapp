// Update the endpoint to your deployed API Gateway or Lambda URL
const LAMBDA_ENDPOINT =
  "https://xetki4ss74.execute-api.us-west-2.amazonaws.com/prod/quiz";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to check if error is retryable
const isRetryableError = (error) => {
  return (
    error.message.includes('Failed to fetch') ||
    error.message.includes('ERR_CONNECTION_RESET') ||
    error.message.includes('ERR_NETWORK') ||
    error.message.includes('timeout') ||
    (error.status >= 500 && error.status < 600) // Server errors
  );
};

export async function getNextQuestion(payload) {
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`API attempt ${attempt}/${MAX_RETRIES}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const res = await fetch(LAMBDA_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('API response:', data);
      
      // Success! Return the data
      return typeof data.body === "string"
        ? JSON.parse(data.body)
        : data.body || data;
        
    } catch (error) {
      lastError = error;
      console.error(`API attempt ${attempt} failed:`, error.message);
      
      // If this is the last attempt, or error is not retryable, throw
      if (attempt === MAX_RETRIES || !isRetryableError(error)) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await wait(delay);
    }
  }
  
  console.error("All API attempts failed:", lastError);
  throw lastError;
}
