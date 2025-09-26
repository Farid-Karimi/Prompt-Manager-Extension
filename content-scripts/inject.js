// content-scripts/inject.js - Content Script Integration goes here
console.log('Prompt Manager content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'insertPrompt') {
    insertPromptIntoPage(request.promptContent);
    sendResponse({success: true});
  }
});

function insertPromptIntoPage(promptContent) {
  const activeElement = document.activeElement;
  
  // Check if we have a text input field focused
  if (activeElement && (
    activeElement.tagName === 'TEXTAREA' || 
    activeElement.tagName === 'INPUT' || 
    activeElement.isContentEditable ||
    activeElement.getAttribute('contenteditable') === 'true'
  )) {
    
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      // For regular text inputs
      activeElement.value = promptContent;
      
      // Trigger input events for frameworks like React/Vue
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
      
    } else if (activeElement.isContentEditable || activeElement.getAttribute('contenteditable') === 'true') {
      // For contenteditable elements (like some rich text editors)
      activeElement.textContent = promptContent;
      
      // Trigger input events
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Focus back to the element
    activeElement.focus();
    
    console.log('Prompt inserted successfully');
  } else {
    // If no text field is focused, try to find common text input selectors
    const commonSelectors = [
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]',
      '.chat-input',
      '#chat-input',
      '[data-testid*="input"]'
    ];
    
    let targetElement = null;
    for (const selector of commonSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        targetElement = elements[elements.length - 1]; // Get the last one (usually most recent)
        break;
      }
    }
    
    if (targetElement) {
      targetElement.focus();
      if (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT') {
        targetElement.value = promptContent;
      } else {
        targetElement.textContent = promptContent;
      }
      
      targetElement.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('Prompt inserted into found text field');
    } else {
      console.log('No suitable text input found on the page');
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(promptContent);
    }
  }
}
