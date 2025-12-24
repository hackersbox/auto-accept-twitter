/**
 * AutoApprove - X Followers
 * Simple and user-controlled extension
 */

// ============================================================================
// Configuration
// ============================================================================

const PROCESSING_DELAY = 2000; // Delay between button clicks (in milliseconds)

let mutationObserver = null;
let isRunning = false;
let totalAccepted = 0;

// ============================================================================
// URL Check
// ============================================================================

function isFollowerRequestsPage() {
  return window.location.pathname.includes('/follower_requests');
}

// ============================================================================
// Auto-Accept Functionality
// ============================================================================

function findAcceptButtons() {
  // Find all buttons with text "Accept"
  const allButtons = Array.from(document.querySelectorAll('button'));
  return allButtons.filter(button => {
    const text = button.textContent.trim();
    return text === 'Accept' && button.offsetParent !== null; // visible check
  });
}

// Helper to get random integer between min and max (inclusive)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to wait for a random amount of time
async function waitRandom(min, max) {
  const delay = getRandomInt(min, max);
  await new Promise(resolve => setTimeout(resolve, delay));
  return delay;
}

let isProcessing = false;

async function processRequests() {
  if (isProcessing || !isRunning) return;

  isProcessing = true;

  try {
    let batchCount = 0;

    while (isRunning) {
      let acceptButtons = findAcceptButtons();

      if (acceptButtons.length === 0) {
        console.log('✓ Auto-Accept: No visible requests, scrolling to load more...');
        window.scrollTo(0, document.body.scrollHeight);

        // Wait for content to load (randomized)
        await waitRandom(3000, 5000);

        // Check for buttons again after scroll
        acceptButtons = findAcceptButtons();

        if (acceptButtons.length === 0) {
          console.log('✓ Auto-Accept: No new requests found after scrolling.');

          // Check if we already reloaded once
          const hasReloaded = sessionStorage.getItem('autoAcceptReloaded');

          if (!hasReloaded) {
            console.log('✓ Auto-Accept: Reloading page to refresh list...');
            sessionStorage.setItem('autoAcceptReloaded', 'true');
            // Force navigation to the specific URL to ensure a clean state
            window.location.href = window.location.origin + '/follower_requests';
            return; // Exit current execution
          } else {
            // Already reloaded and still no buttons -> Done
            console.log('✓ Auto-Accept: Still no requests after reload. Process complete.');
            alert('Auto-Accept: No pending invites found. Redirecting to Home...');

            // Clear flag and redirect
            sessionStorage.removeItem('autoAcceptReloaded');
            window.location.href = 'https://x.com/home';
            break;
          }
        }
      }

      console.log(`✓ Auto-Accept: Found ${acceptButtons.length} pending requests. Processing...`);

      for (let i = 0; i < acceptButtons.length; i++) {
        if (!isRunning) break;

        const button = acceptButtons[i];

        // Re-check if button is still valid and "Accept" (it might have changed)
        if (button.textContent.trim() !== 'Accept') continue;

        try {
          button.click();
          totalAccepted++;
          console.log(`✓ Auto-Accept: Accepted request #${totalAccepted}`);
          batchCount++;

          // 1. Anti-Bot: Randomized Delay between clicks (1s to 3s)
          await waitRandom(1000, 3000);

          // 2. Anti-Bot: Micro-break every 20-30 clicks to mimic human fatigue
          if (batchCount >= getRandomInt(20, 30)) {
            console.log('✓ Auto-Accept: Taking a short break...');
            await waitRandom(5000, 10000);
            batchCount = 0; // Reset batch count
          }

          // Clear reload flag if we successfully processed a button. 
          // This allows the reload logic to work again for the next empty state.
          sessionStorage.removeItem('autoAcceptReloaded');

        } catch (error) {
          console.error('✗ Auto-Accept: Error clicking button:', error);
        }
      }

      // Small pause before checking for more buttons or finishing the batch
      // This allows any pending DOM updates to settle if we cleared the list
      await waitRandom(500, 1200);
    }
  } finally {
    isProcessing = false;
  }
}

function createMutationObserver() {
  return new MutationObserver((mutations) => {
    if (!isRunning) return;

    // Check if new nodes were added
    const hasNewNodes = mutations.some(mutation =>
      mutation.type === 'childList' && mutation.addedNodes.length > 0
    );

    if (hasNewNodes) {
      // Small delay to let content render
      setTimeout(processRequests, 100);
    }
  });
}

// ============================================================================
// Start/Stop Automation
// ============================================================================

function startAutomation() {
  if (isRunning) return;

  console.log('✓ Auto-Accept: Extension activated on follower requests page');
  console.log('✓ Auto-Accept: Will automatically accept requests as they appear');
  console.log('✓ Auto-Accept: Scroll down to load more requests');

  isRunning = true;

  // Initial process of existing buttons
  setTimeout(processRequests, 1000);

  // Start MutationObserver to detect new content
  mutationObserver = createMutationObserver();
  const targetNode = document.body;
  mutationObserver.observe(targetNode, {
    childList: true,
    subtree: true
  });
}

function stopAutomation() {
  isRunning = false;

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  console.log(`✓ Auto-Accept: Stopped. Total accepted: ${totalAccepted}`);
}

// ============================================================================
// Initialization
// ============================================================================

function initialize() {
  if (!isFollowerRequestsPage()) {
    return;
  }

  // Wait for page to fully load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(startAutomation, 1000);
    });
  } else {
    setTimeout(startAutomation, 1000);
  }
}

// Handle SPA navigation (Twitter/X uses client-side routing)
let lastUrl = window.location.href;
const urlCheckInterval = setInterval(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;

    // Stop automation if we navigate away
    if (!isFollowerRequestsPage() && isRunning) {
      stopAutomation();
    }
    // Start automation if we navigate to the page
    else if (isFollowerRequestsPage() && !isRunning) {
      initialize();
    }
  }
}, 1000);

// Start the script
initialize();
