const bedrockClient = require("../utils/bedrockClient");

exports.handler = async (event) => {
  try {
    const inputText = event.query || "What is the weather today?";
    const response = await bedrockClient.queryBedrock(inputText);

    return {
      statusCode: 200,
      body: JSON.stringify({
        query: inputText,
        response: response,
      }),
    };
  } catch (error) {
    console.error("Error querying Bedrock:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
