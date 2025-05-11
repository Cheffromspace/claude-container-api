const { createLogger } = require('../utils/logger');

const logger = createLogger('claudeServiceSimple');

/**
 * Processes a command using Claude Code CLI - simplified version
 * 
 * @param {Object} options - The options for processing the command
 * @param {string} options.repoFullName - The full name of the repository (owner/repo)
 * @param {number|null} options.issueNumber - The issue number (can be null for direct API calls)
 * @param {string} options.command - The command to process with Claude
 * @param {boolean} [options.useContainer=false] - Whether to use a container per request
 * @returns {Promise<string>} - Claude's response
 */
async function processCommand({ repoFullName, issueNumber, command, useContainer = false }) {
  try {
    logger.info({
      repo: repoFullName,
      issue: issueNumber,
      commandLength: command.length,
      useContainer
    }, 'Processing command with Claude (simple service)');

    // Test mode response (used for GitHub integration tests)
    if (process.env.NODE_ENV === 'test' || !process.env.GITHUB_TOKEN) {
      logger.info({
        repo: repoFullName,
        issue: issueNumber
      }, 'TEST MODE: Simulating Claude execution');

      return `Hello! I'm Claude responding to your question: "${command}"

Since this is a test environment, I'm providing a simulated response. In production, I would:
1. Clone the repository ${repoFullName}
2. Research the codebase
3. Provide an informed answer to your question

For real functionality, please configure valid GitHub and Claude API tokens.`;
    }

    // Container-based approach
    if (useContainer) {
      logger.info({ repo: repoFullName }, 'Using container approach for Claude execution');
      
      // Create a simulated containerized response for testing
      const containerResponse = 
        `Claude Container Response\n` +
        `------------------------\n` +
        `Repository: ${repoFullName}\n` +
        `Command: ${command}\n\n` +
        `This is a simulated container-based Claude response.\n` +
        `In production, this would execute Claude inside a Docker container\n` +
        `with access to the specified repository code.\n` +
        `Time: ${new Date().toISOString()}`;
      
      logger.info('Container simulation complete');
      return containerResponse;
    }
    
    // Standard approach - simulate Claude response
    logger.info({ repo: repoFullName }, 'Using standard approach for Claude execution');
    
    // Simulate a Claude response
    const standardResponse = 
      `Claude Standard Response\n` +
      `----------------------\n` +
      `Repository: ${repoFullName}\n` +
      `Command: ${command}\n\n` +
      `This is a simulated standard Claude response.\n` +
      `In production, this would execute Claude with a cloned repository.\n` +
      `Time: ${new Date().toISOString()}`;
    
    logger.info('Standard simulation complete');
    return standardResponse;
  } catch (error) {
    logger.error({
      err: {
        message: error.message,
        stack: error.stack
      },
      repo: repoFullName,
      issue: issueNumber
    }, 'Error processing command with Claude');

    throw new Error(`Failed to process command: ${error.message}`);
  }
}

module.exports = {
  processCommand
};