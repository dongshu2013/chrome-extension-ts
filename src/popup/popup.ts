// Side panel functionality
document.addEventListener('DOMContentLoaded', async () => {
  const openButton = document.getElementById('open-sidepanel');
  if (openButton) {
    openButton.addEventListener('click', async () => {
      try {
        // First ensure the side panel is enabled
        await chrome.sidePanel.setOptions({
          enabled: true,
          path: 'sidepanel.html'
        });
        
        // Get current window
        const currentWindow = await chrome.windows.getCurrent();
        
        // Open the side panel with current window ID
        await chrome.sidePanel.open({
          windowId: currentWindow.id
        });
        
        // Close the popup
        window.close();
      } catch (error) {
        console.error('Failed to open side panel:', error);
      }
    });
  }
});
