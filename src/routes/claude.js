const express = require('express');
const router = express.Router();
const claudeService = require('../services/claudeService');
const claudeServiceSimple = require('../services/claudeServiceSimple');
const { createLogger } = require('../utils/logger');

const logger = createLogger('claudeRoutes');

/**
 * Test endpoint for container execution
 */
router.post('/test-container', async (req, res) => {
  try {
    const { command } = req.body;

    console.log('Received container test request:', command);

    const containerName = `claude-test-${Date.now()}`;
    const { execSync } = require('child_process');

    try {
      // Execute a simple echo command in the container
      const dockerCommand = `docker run --rm --name ${containerName} claudecode:latest "echo '${command || "Test from container"}'"`;

      console.log('Docker command:', dockerCommand);

      const result = execSync(dockerCommand);
      const output = result.toString();

      console.log('Container output:', output);

      return res.status(200).json({
        message: 'Container test executed successfully',
        response: output
      });
    } catch (error) {
      console.error('Error running container:', error.message);
      return res.status(500).json({
        error: 'Container test failed',
        message: error.message
      });
    }
  } catch (error) {
    console.error('Error in test-container endpoint:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Direct endpoint for Claude processing
 * Allows calling Claude without GitHub webhook integration
 */
router.post('/', async (req, res) => {
  console.log('Received direct Claude request:', req.body);
  try {
    const { repoFullName, command, authToken, useContainer = false } = req.body;

    // Validate required parameters
    if (!repoFullName) {
      logger.warn('Missing repository name in request');
      return res.status(400).json({ error: 'Repository name is required' });
    }

    if (!command) {
      logger.warn('Missing command in request');
      return res.status(400).json({ error: 'Command is required' });
    }

    // Validate authentication if enabled
    if (process.env.CLAUDE_API_AUTH_REQUIRED === '1') {
      if (!authToken || authToken !== process.env.CLAUDE_API_AUTH_TOKEN) {
        logger.warn('Invalid authentication token');
        return res.status(401).json({ error: 'Invalid authentication token' });
      }
    }

    logger.info({
      repo: repoFullName,
      commandLength: command.length,
      useContainer
    }, 'Processing direct Claude command');

    // Process the command with Claude using the simplified service
    let claudeResponse;
    try {
      claudeResponse = await claudeServiceSimple.processCommand({
        repoFullName,
        issueNumber: null, // No issue number for direct calls
        command,
        useContainer: useContainer === true || useContainer === 'true'
      });

      console.log('Raw Claude response:', claudeResponse);
      console.log('Response type:', typeof claudeResponse);
      console.log('Response length:', claudeResponse ? claudeResponse.length : 0);

      // Force a default response if empty
      if (!claudeResponse || claudeResponse.trim() === '') {
        claudeResponse = "No output received from Claude container. This is a placeholder response.";
      }
    } catch (processingError) {
      console.error('Error during Claude processing:', processingError);
      claudeResponse = `Error: ${processingError.message}`;
    }

    logger.info({
      responseLength: claudeResponse ? claudeResponse.length : 0
    }, 'Successfully processed Claude command');

    return res.status(200).json({
      message: 'Command processed successfully',
      response: claudeResponse
    });
  } catch (error) {
    logger.error({
      err: {
        message: error.message,
        stack: error.stack
      }
    }, 'Error processing direct Claude command');
    
    return res.status(500).json({ 
      error: 'Failed to process command',
      message: error.message
    });
  }
});

module.exports = router;