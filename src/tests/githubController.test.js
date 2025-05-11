const crypto = require('crypto');
const githubController = require('../controllers/githubController');
const claudeService = require('../services/claudeService');
const githubService = require('../services/githubService');

// Mock the services
jest.mock('../services/claudeService');
jest.mock('../services/githubService');

describe('GitHub Controller', () => {
  let req, res;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create request and response mocks
    req = {
      headers: {
        'x-github-event': 'issue_comment',
        'x-hub-signature-256': ''
      },
      body: {
        action: 'created',
        comment: {
          body: '@MCPClaude Tell me about this repository'
        },
        issue: {
          number: 123
        },
        repository: {
          full_name: 'owner/repo',
          name: 'repo',
          owner: {
            login: 'owner'
          }
        }
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Mock the environment variable
    process.env.GITHUB_WEBHOOK_SECRET = 'test_secret';
    
    // Set up the signature
    const payload = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
    req.headers['x-hub-signature-256'] = 'sha256=' + hmac.update(payload).digest('hex');
    
    // Mock successful responses from services
    claudeService.processCommand.mockResolvedValue('Claude response');
    githubService.postComment.mockResolvedValue({ id: 456 });
  });
  
  test('should process a valid webhook with @MCPClaude mention', async () => {
    await githubController.handleWebhook(req, res);
    
    // Verify that Claude service was called with correct parameters
    expect(claudeService.processCommand).toHaveBeenCalledWith({
      repoFullName: 'owner/repo',
      issueNumber: 123,
      command: 'Tell me about this repository'
    });
    
    // Verify that GitHub service was called to post a comment
    expect(githubService.postComment).toHaveBeenCalledWith({
      repoOwner: 'owner',
      repoName: 'repo',
      issueNumber: 123,
      body: 'Claude response'
    });
    
    // Verify response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Webhook processed successfully' });
  });
  
  test('should reject a webhook with invalid signature', async () => {
    // Tamper with the signature
    req.headers['x-hub-signature-256'] = 'sha256=invalid_signature';
    
    await githubController.handleWebhook(req, res);
    
    // Verify that services were not called
    expect(claudeService.processCommand).not.toHaveBeenCalled();
    expect(githubService.postComment).not.toHaveBeenCalled();
    
    // Verify response
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid webhook signature' });
  });
  
  test('should ignore comments without @MCPClaude mention', async () => {
    // Remove the @MCPClaude mention
    req.body.comment.body = 'This is a regular comment';
    
    // Update the signature
    const payload = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
    req.headers['x-hub-signature-256'] = 'sha256=' + hmac.update(payload).digest('hex');
    
    await githubController.handleWebhook(req, res);
    
    // Verify that services were not called
    expect(claudeService.processCommand).not.toHaveBeenCalled();
    expect(githubService.postComment).not.toHaveBeenCalled();
    
    // Verify response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Webhook processed successfully' });
  });
  
  test('should handle errors from Claude service', async () => {
    // Make Claude service throw an error
    claudeService.processCommand.mockRejectedValue(new Error('Claude error'));
    
    await githubController.handleWebhook(req, res);
    
    // Verify that GitHub service was called to post an error comment
    expect(githubService.postComment).toHaveBeenCalledWith({
      repoOwner: 'owner',
      repoName: 'repo',
      issueNumber: 123,
      body: 'Error processing command: Claude error'
    });
    
    // Verify response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Webhook processed successfully' });
  });
});