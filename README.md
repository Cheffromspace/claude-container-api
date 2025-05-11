# Claude GitHub Webhook

A webhook endpoint for Claude to perform Git and GitHub actions. This microservice allows Claude to respond to mentions in GitHub comments and help with repository tasks.

## Use Cases

- Trigger Claude when mentioned in GitHub comments with `@MCPClaude`
- Allow Claude to research repository code and answer questions
- Direct API access for Claude without GitHub webhook requirements
- Stateless container execution mode for isolation and scalability
- Optionally permit Claude to make code changes when requested

## Setup Guide

### Prerequisites

- Node.js 16 or higher
- npm or yarn
- GitHub account with access to the repositories you want to use

### Step-by-Step Installation

1. **Clone this repository**
   ```
   git clone https://github.com/yourusername/claude-github-webhook.git
   cd claude-github-webhook
   ```

2. **Run the setup script**
   ```
   ./scripts/setup.sh
   ```
   This will create necessary directories, copy the environment template, and install dependencies.

3. **Configure Credentials**

   Copy the `.env.example` file to `.env` and edit with your credentials:
   ```
   cp .env.example .env
   nano .env  # or use your preferred editor
   ```

   **a. GitHub Webhook Secret**
   - Generate a secure random string to use as your webhook secret
   - You can use this command to generate one:
     ```
     node -e "console.log(require('crypto').randomBytes(20).toString('hex'))"
     ```
   - Save this value in your `.env` file as `GITHUB_WEBHOOK_SECRET`
   - You'll use this same value when setting up the webhook in GitHub

   **b. GitHub Personal Access Token**
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Click "Generate new token"
   - Name your token (e.g., "Claude GitHub Webhook")
   - Set the expiration as needed
   - Select the repositories you want Claude to access
   - Under "Repository permissions":
     - Issues: Read and write (to post comments)
     - Contents: Read (to read repository code)
   - Click "Generate token"
   - Copy the generated token to your `.env` file as `GITHUB_TOKEN`

   **c. AWS Credentials (for Claude via Bedrock)**
   - You need AWS Bedrock credentials to access Claude
   - Update the following values in your `.env` file:
     ```
     AWS_ACCESS_KEY_ID=your_aws_access_key
     AWS_SECRET_ACCESS_KEY=your_aws_secret_key
     AWS_REGION=us-east-1
     CLAUDE_CODE_USE_BEDROCK=1
     ANTHROPIC_MODEL=anthropic.claude-3-sonnet-20240229-v1:0
     ```
   - Note: You don't need a Claude/Anthropic API key when using Bedrock

   **d. Server Port and Other Settings**
   - By default, the server runs on port 3000
   - To use a different port, set the `PORT` environment variable in your `.env` file
   - Review other settings in the `.env` file for customization options

4. **Start the server**
   ```
   npm start
   ```
   For development with auto-restart:
   ```
   npm run dev
   ```

### GitHub Webhook Configuration

1. **Go to your GitHub repository**
2. **Navigate to Settings → Webhooks**
3. **Click "Add webhook"**
4. **Configure the webhook:**
   - Payload URL: `https://claude.jonathanflatt.org/api/webhooks/github`
   - Content type: `application/json`
   - Secret: The same value you set for `GITHUB_WEBHOOK_SECRET` in your `.env` file
   - Events: Select "Send me everything" if you want to handle multiple event types, or choose specific events
   - Active: Check this box to enable the webhook
5. **Click "Add webhook"**

### Testing Your Setup

1. **Verify the webhook is receiving events**
   - After setting up the webhook, GitHub will send a ping event
   - Check your server logs to confirm it's receiving events

2. **Test with a sample comment**
   - Create a new issue or pull request in your repository
   - Add a comment mentioning `@MCPClaude` followed by a question, like:
     ```
     @MCPClaude What does this repository do?
     ```
   - Claude should respond with a new comment in the thread

3. **Using the test utilities**
   - You can use the included test utility to verify your webhook setup:
     ```
     node test-outgoing-webhook.js
     ```
   - This will start a test server and provide instructions for testing

   - To test the direct Claude API:
     ```
     node test-claude-api.js owner/repo
     ```
   - To test the container-based execution:
     ```
     ./build-claude-container.sh  # First build the container
     node test-claude-api.js owner/repo container "Your command here"
     ```

## Troubleshooting

### Webhook Not Receiving Events
- Verify your server is publicly accessible
- Check your server logs for errors
- Confirm the webhook secret matches between GitHub and your `.env` file
- Review GitHub webhook delivery logs in the repository settings

### Claude Not Responding
- Check server logs for errors
- Verify your AWS credentials are correct
- Ensure your GitHub token has the necessary permissions
- Make sure your comment includes the `@MCPClaude` mention

## Direct Claude API

The server provides a direct API endpoint for Claude that doesn't rely on GitHub webhooks. This allows you to integrate Claude with other systems or test Claude's responses.

### API Endpoint

```
POST /api/claude
```

### Request Body

| Parameter | Type | Description |
|-----------|------|-------------|
| repoFullName | string | The repository name in the format "owner/repo" |
| command | string | The command or question to send to Claude |
| authToken | string | Optional authentication token (required if CLAUDE_API_AUTH_REQUIRED=1) |
| useContainer | boolean | Whether to use container-based execution (optional, defaults to false) |

### Example Request

```json
{
  "repoFullName": "owner/repo",
  "command": "Explain what this repository does",
  "authToken": "your-auth-token",
  "useContainer": true
}
```

### Example Response

```json
{
  "message": "Command processed successfully",
  "response": "This repository is a webhook server that integrates Claude with GitHub..."
}
```

### Authentication

To secure the API, you can enable authentication by setting the following environment variables:

```
CLAUDE_API_AUTH_REQUIRED=1
CLAUDE_API_AUTH_TOKEN=your-secret-token
```

### Container-Based Execution

The container-based execution mode provides isolation and better scalability. When enabled, each request will:

1. Launch a new Docker container with Claude Code CLI
2. Clone the repository inside the container
3. Execute the command
4. Return the response
5. Remove the container

To enable container-based execution:

1. Build the Claude container:
   ```
   ./build-claude-container.sh
   ```

2. Set the environment variables:
   ```
   CLAUDE_USE_CONTAINERS=1
   CLAUDE_CONTAINER_IMAGE=claudecode:latest
   REPO_CACHE_DIR=/path/to/cache  # Optional
   ```

## Development

To run the server in development mode with auto-restart:

```
npm run dev
```

## Testing

Run tests with:

```
npm test
```