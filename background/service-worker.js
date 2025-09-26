// background/service-worker.js
importScripts('default-prompts.js');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Prompt Manager extension installed');
  
  chrome.storage.local.get(['prompts', 'extensionVersion'], (result) => {
    const currentVersion = '1.0';
    
    // Fresh install or version upgrade
    if (!result.prompts || result.prompts.length === 0 || result.extensionVersion !== currentVersion) {
      chrome.storage.local.set({ 
        'prompts': DEFAULT_PROMPTS,
        'extensionVersion': currentVersion 
      });
      console.log(`✅ Installed ${DEFAULT_PROMPTS.length} default prompts`);
    } else {
      console.log(`Found existing ${result.prompts.length} prompts`);
    }
  });
});

// Optional: Add some popular prompts as pinned by default
chrome.runtime.onInstalled.addListener(() => {
  // Set some prompts as pinned by default
  const popularPromptTitles = [
    'English Translator and Improver',
    'Linux Terminal', 
    'JavaScript Console',
    'Position Interviewer',
    'Excel Sheet'
  ];
  
  setTimeout(() => {
    chrome.storage.local.get(['prompts'], (result) => {
      if (result.prompts) {
        const updatedPrompts = result.prompts.map(prompt => {
          if (popularPromptTitles.includes(prompt.title)) {
            return { ...prompt, isPinned: true };
          }
          return prompt;
        });
        
        chrome.storage.local.set({ 'prompts': updatedPrompts });
        console.log('✅ Set popular prompts as pinned');
      }
    });
  }, 1000);
});
