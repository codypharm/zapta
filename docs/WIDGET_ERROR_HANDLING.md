/**
 * Widget Error Handling Enhancement
 * 
 * When a subscription owner's account has usage limits reached or is expired,
 * widget users now see friendly error messages instead of raw errors.
 * 
 * ## Error Scenarios:
 * 
 * 1. **Message Limit Reached** (HTTP 429)
 *    - User sees: "This agent has reached its usage limit. Please try again later or contact support."
 *    - Owner sees: Dashboard warning banner
 *    - Owner action: Upgrade plan
 * 
 * 2. **Subscription Expired** (HTTP 429)
 *    - User sees: Same friendly message
 *    - Owner sees: Billing dashboard alert
 *    - Owner action: Renew subscription
 * 
 * 3. **Other Errors** (HTTP 500)
 *    - User sees: "I'm having trouble responding right now. Please try again in a moment."
 *    - Owner receives webhook notification (if configured)
 * 
 * ## Implementation Details:
 * 
 * - Widget API endpoint checks error messages for limit keywords
 * - Returns HTTP 429 (Too Many Requests) for limit errors
 * - Includes `limitReached: true` flag in response
 * - Owner receives webhook notification of failure
 * - Widget UI should handle 429 status gracefully
 * 
 * ## Next Steps (Optional Enhancements):
 * 
 * 1. **Grace Period**: Give 24-hour grace period after limit reached
 * 2. **Custom Messages**: Let owners set custom out-of-quota messages
 * 3. **Email Notifications**: Auto-email owner when limit reached
 * 4. **Widget Badge**: Show "Powered by Zapta - Upgrade to remove limits" on free plan
 */

export const WIDGET_ERROR_HANDLING_DOCS = true;
