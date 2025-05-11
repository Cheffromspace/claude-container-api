const axios = require('axios');
const { createLogger } = require('../utils/logger');

const logger = createLogger('githubService');

/**
 * Posts a comment to a GitHub issue or pull request
 */
async function postComment({ repoOwner, repoName, issueNumber, body }) {
  try {
    logger.info({
      repo: `${repoOwner}/${repoName}`,
      issue: issueNumber,
      bodyLength: body.length
    }, 'Posting comment to GitHub');

    // In test mode, just log the comment instead of posting to GitHub
    if (process.env.NODE_ENV === 'test' || !process.env.GITHUB_TOKEN.includes('ghp_')) {
      logger.info({
        repo: `${repoOwner}/${repoName}`,
        issue: issueNumber,
        bodyPreview: body.substring(0, 100) + (body.length > 100 ? '...' : '')
      }, 'TEST MODE: Would post comment to GitHub');

      return {
        id: 'test-comment-id',
        body: body,
        created_at: new Date().toISOString()
      };
    }

    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`;

    const response = await axios.post(
      url,
      { body },
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Claude-GitHub-Webhook'
        }
      }
    );

    logger.info({
      repo: `${repoOwner}/${repoName}`,
      issue: issueNumber,
      commentId: response.data.id
    }, 'Comment posted successfully');

    return response.data;
  } catch (error) {
    logger.error({
      err: {
        message: error.message,
        responseData: error.response?.data
      },
      repo: `${repoOwner}/${repoName}`,
      issue: issueNumber
    }, 'Error posting comment to GitHub');

    throw new Error(`Failed to post comment: ${error.message}`);
  }
}

/**
 * Triggers an outgoing webhook with the payload from a GitHub event
 * @param {Object} options - The options for the webhook
 * @param {string} options.targetUrl - The URL to send the webhook to
 * @param {Object} options.payload - The payload to send to the webhook
 * @param {Object} [options.headers] - Optional custom headers to include with the request
 * @returns {Promise<Object>} - The response from the webhook
 */
async function triggerOutgoingWebhook({ targetUrl, payload, headers = {} }) {
  try {
    logger.info({
      targetUrl,
      event: payload.event,
      action: payload.action,
      repo: payload.repository?.full_name
    }, 'Triggering outgoing webhook');

    // In test mode, just log the webhook instead of sending it
    if (process.env.NODE_ENV === 'test') {
      logger.info({
        targetUrl,
        event: payload.event,
        headerCount: Object.keys(headers).length
      }, 'TEST MODE: Would send webhook');

      return {
        success: true,
        message: 'Webhook simulated in test mode',
        timestamp: new Date().toISOString()
      };
    }

    // Add signature to webhook if secret is provided
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Claude-GitHub-Outgoing-Webhook',
    };

    // Add signature if webhook secret is configured
    if (process.env.OUTGOING_WEBHOOK_SECRET) {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', process.env.OUTGOING_WEBHOOK_SECRET);
      const signature = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
      defaultHeaders['X-Hub-Signature-256'] = signature;

      logger.debug('Added signature to outgoing webhook');
    } else {
      logger.debug('No webhook secret configured, skipping signature');
    }

    // Merge default headers with custom headers
    const mergedHeaders = { ...defaultHeaders, ...headers };

    logger.debug({
      headerCount: Object.keys(mergedHeaders).length,
      payloadSize: JSON.stringify(payload).length
    }, 'Sending webhook request');

    const response = await axios.post(targetUrl, payload, { headers: mergedHeaders });

    logger.info({
      targetUrl,
      status: response.status,
      responseSize: JSON.stringify(response.data).length
    }, 'Webhook triggered successfully');

    return response.data;
  } catch (error) {
    logger.error({
      err: {
        message: error.message,
        responseData: error.response?.data
      },
      targetUrl
    }, 'Error triggering outgoing webhook');

    throw new Error(`Failed to trigger webhook: ${error.message}`);
  }
}

module.exports = {
  postComment,
  triggerOutgoingWebhook
};
