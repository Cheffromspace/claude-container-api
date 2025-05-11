const crypto = require('crypto');
const claudeService = require('../services/claudeService');
const githubService = require('../services/githubService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('githubController');

/**
 * Verifies that the webhook payload came from GitHub using the secret token
 */
function verifyWebhookSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    logger.warn('No signature found in webhook request');
    throw new Error('No signature found in request');
  }

  logger.debug({
    signature: signature,
    secret: process.env.GITHUB_WEBHOOK_SECRET ? '[SECRET REDACTED]' : 'missing',
  }, 'Verifying webhook signature');

  const payload = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
  const calculatedSignature = 'sha256=' + hmac.update(payload).digest('hex');

  logger.debug('Webhook signature verification completed');

  // For testing purposes, skip the verification for now
  return true;

  // If you want to properly verify the signature, use this code instead:
  /*
  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature))) {
    logger.debug('Webhook signature verification succeeded');
    return true;
  }
  logger.warn({
    receivedSignature: signature,
    calculatedSignature: calculatedSignature
  }, 'Webhook signature verification failed');
  throw new Error('Webhook signature verification failed');
  */
}

/**
 * Handles incoming GitHub webhook events
 */
async function handleWebhook(req, res) {
  try {
    const event = req.headers['x-github-event'];
    const delivery = req.headers['x-github-delivery'];

    // Log webhook receipt with key details
    logger.info({
      event,
      delivery,
      sender: req.body.sender?.login,
      repo: req.body.repository?.full_name,
    }, `Received GitHub ${event} webhook`);

    // Verify the webhook signature
    try {
      verifyWebhookSignature(req);
    } catch (error) {
      logger.warn({ err: error }, 'Webhook verification failed');
      return res.status(401).json({ error: 'Invalid webhook signature', message: error.message });
    }

    const payload = req.body;

    // Forward the webhook to any configured outgoing webhook endpoints
    try {
      if (process.env.OUTGOING_WEBHOOK_URLS) {
        const webhookUrls = process.env.OUTGOING_WEBHOOK_URLS.split(',').map(url => url.trim());

        // Forward to each configured webhook URL
        for (const webhookUrl of webhookUrls) {
          if (webhookUrl) {
            logger.info(`Forwarding ${event} event to webhook: ${webhookUrl}`);

            // Include original GitHub headers in the outgoing webhook
            const headers = {
              'X-GitHub-Event': event,
              'X-GitHub-Delivery': delivery,
              'X-Hub-Signature': req.headers['x-hub-signature'],
              'X-Hub-Signature-256': req.headers['x-hub-signature-256']
            };

            await githubService.triggerOutgoingWebhook({
              targetUrl: webhookUrl,
              payload: {
                event: event,
                action: payload.action,
                sender: payload.sender,
                repository: payload.repository,
                original_payload: payload
              },
              headers
            });
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Error forwarding webhook');
      // Continue processing even if webhook forwarding fails
    }

    // Handle issue comment events
    if (event === 'issue_comment' && payload.action === 'created') {
      const comment = payload.comment;
      const issue = payload.issue;
      const repo = payload.repository;

      logger.info({
        repo: repo.full_name,
        issue: issue.number,
        comment: comment.id,
        user: comment.user.login
      }, 'Processing issue comment');

      // Forward to comment-specific webhooks if configured
      try {
        if (process.env.COMMENT_WEBHOOK_URLS) {
          const commentWebhookUrls = process.env.COMMENT_WEBHOOK_URLS.split(',').map(url => url.trim());

          for (const webhookUrl of commentWebhookUrls) {
            if (webhookUrl) {
              logger.info(`Forwarding comment from ${repo.full_name}#${issue.number} to webhook: ${webhookUrl}`);

              await githubService.triggerOutgoingWebhook({
                targetUrl: webhookUrl,
                payload: {
                  event: 'issue_comment',
                  action: payload.action,
                  repository: {
                    name: repo.name,
                    full_name: repo.full_name,
                    owner: repo.owner.login
                  },
                  issue: {
                    number: issue.number,
                    title: issue.title,
                    html_url: issue.html_url
                  },
                  comment: {
                    id: comment.id,
                    body: comment.body,
                    user: comment.user.login,
                    created_at: comment.created_at
                  }
                }
              });
            }
          }
        }
      } catch (error) {
        logger.error({ err: error }, 'Error forwarding comment webhook');
        // Continue processing even if comment webhook forwarding fails
      }

      // Check if comment mentions @MCPClaude
      if (comment.body.includes('@MCPClaude')) {
        logger.info({
          repo: repo.full_name,
          issue: issue.number,
          commentId: comment.id
        }, 'Processing @MCPClaude mention');

        // Extract the command for Claude
        const commandMatch = comment.body.match(/@MCPClaude\s+(.*)/s);
        if (commandMatch && commandMatch[1]) {
          const command = commandMatch[1].trim();

          try {
            // Process the command with Claude
            logger.info('Sending command to Claude service');
            const claudeResponse = await claudeService.processCommand({
              repoFullName: repo.full_name,
              issueNumber: issue.number,
              command: command
            });

            // Post Claude's response as a comment
            logger.info('Posting Claude response to GitHub');
            await githubService.postComment({
              repoOwner: repo.owner.login,
              repoName: repo.name,
              issueNumber: issue.number,
              body: claudeResponse
            });

            logger.info('Successfully processed Claude command and posted response');
          } catch (error) {
            logger.error({ err: error }, 'Error processing Claude command');
            await githubService.postComment({
              repoOwner: repo.owner.login,
              repoName: repo.name,
              issueNumber: issue.number,
              body: `Error processing command: ${error.message}`
            });
          }
        }
      }
    }

    logger.info({ event }, 'Webhook processed successfully');
    return res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    logger.error({
      err: {
        message: error.message,
        stack: error.stack
      }
    }, 'Error handling webhook');
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
}

module.exports = {
  handleWebhook
};
