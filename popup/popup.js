class PromptManager {
  constructor() {
    this.prompts = [];
    this.editingPromptId = null;
    this.currentFilter = 'all'; // Current filter: 'all', 'pinned', or category value
    this.init();
  }

  async init() {
    await this.loadPrompts();
    this.setupEventListeners();
    this.renderBasedOnFilter();
  }

  async loadPrompts() {
    try {
      const result = await chrome.storage.local.get(['prompts']);
      this.prompts = result.prompts || [];
      console.log('Prompts loaded:', this.prompts.length);
    } catch (error) {
      console.error('Error loading prompts:', error);
      this.prompts = [];
    }
  }

  async savePrompts() {
    try {
      await chrome.storage.local.set({ prompts: this.prompts });
      console.log('Prompts saved');
    } catch (error) {
      console.error('Error saving prompts:', error);
    }
  }

  setupEventListeners() {
    document.getElementById('addPrompt').addEventListener('click', () => {
      this.editingPromptId = null; // New prompt
      this.showAddModal();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query) {
        const filtered = this.searchPrompts(query);
        this.renderFilteredPrompts(filtered);
      } else {
        this.renderBasedOnFilter();
      }
    });

    document.getElementById('showPinned').addEventListener('click', () => {
      this.currentFilter = 'pinned';
      this.renderPrompts('pinned');
    });

    document.getElementById('showAll').addEventListener('click', () => {
      this.currentFilter = 'all';
      this.renderPrompts('all');
    });

    document.getElementById('savePrompt').addEventListener('click', async () => {
      await this.savePrompt();
    });

    document.getElementById('cancelEdit').addEventListener('click', () => {
      this.hideAddModal();
    });
  }

  searchPrompts(query) {
    const lower = query.toLowerCase();
    return this.prompts.filter(p =>
      p.title.toLowerCase().includes(lower) ||
      p.content.toLowerCase().includes(lower)
    );
  }

  renderBasedOnFilter() {
    if (this.currentFilter === 'all' || this.currentFilter === 'pinned') {
      this.renderPrompts(this.currentFilter);
    }
  }

  renderPrompts(filter = 'all') {
    let promptsToShow = this.prompts;
    if (filter === 'pinned') {
      promptsToShow = this.prompts.filter(p => p.isPinned);
    }
    this.renderFilteredPrompts(promptsToShow);
  }

  renderFilteredPrompts(prompts) {
    const container = document.getElementById('promptsList');

    if (!prompts.length) {
      container.innerHTML = `<div style="text-align:center; padding:20px; color:#888;">No prompts to show.</div>`;
      return;
    }

    // Sort: pinned first, then last used desc
    prompts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.lastUsed || 0) - (a.lastUsed || 0);
    });

    container.innerHTML = prompts.map(p => `
      <div class="prompt-item ${p.isPinned ? 'pinned' : ''}" data-id="${p.id}">
        <h4>${p.title}</h4>
        <p>${p.content.substring(0, 100)}${p.content.length > 100 ? '...' : ''}</p>
        <div class="actions">
          <button class="use-btn">Use</button>
          <button class="pin-btn">${p.isPinned ? 'Unpin' : 'Pin'}</button>
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll('.use-btn').forEach(btn => {
      btn.onclick = e => {
        const id = e.target.closest('.prompt-item').dataset.id;
        this.usePrompt(id);
      };
    });
    container.querySelectorAll('.pin-btn').forEach(btn => {
      btn.onclick = e => {
        const id = e.target.closest('.prompt-item').dataset.id;
        this.togglePin(id);
      };
    });
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = e => {
        const id = e.target.closest('.prompt-item').dataset.id;
        this.editPrompt(id);
      };
    });
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = e => {
        const id = e.target.closest('.prompt-item').dataset.id;
        this.deletePrompt(id);
      };
    });
  }

  async usePrompt(id) {
    const prompt = this.prompts.find(p => p.id === id);
    if (!prompt) return;

    try {
      await navigator.clipboard.writeText(prompt.content);
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'insertPrompt',
        promptContent: prompt.content
      });
      prompt.lastUsed = Date.now();
      await this.savePrompts();
      window.close();
    } catch (e) {
      console.error('Error using prompt:', e);
    }
  }

  async togglePin(id) {
    const prompt = this.prompts.find(p => p.id === id);
    if (!prompt) return;

    prompt.isPinned = !prompt.isPinned;
    await this.savePrompts();
    this.renderBasedOnFilter();
  }

  editPrompt(id) {
    const prompt = this.prompts.find(p => p.id === id);
    if (!prompt) return;

    this.editingPromptId = id;
    document.getElementById('promptTitle').value = prompt.title;
    document.getElementById('promptContent').value = prompt.content;
    this.showAddModal();
  }

  async savePrompt() {
    const title = document.getElementById('promptTitle').value.trim();
    const content = document.getElementById('promptContent').value.trim();

    if (!title || !content) {
      alert('Please fill in both title and content');
      return;
    }

    if (this.editingPromptId) {
      const index = this.prompts.findIndex(p => p.id === this.editingPromptId);
      if (index !== -1) {
        this.prompts[index].title = title;
        this.prompts[index].content = content;
        this.prompts[index].lastUsed = Date.now();
      }
      this.editingPromptId = null;
    } else {
      this.prompts.unshift({
        id: Date.now().toString(),
        title,
        content,
        isPinned: false,
        lastUsed: Date.now()
      });
    }
    await this.savePrompts();

    this.renderBasedOnFilter();
    this.hideAddModal();
  }

  showAddModal() {
    if (!this.editingPromptId) {
      document.getElementById('promptTitle').value = '';
      document.getElementById('promptContent').value = '';
    }
    document.getElementById('addModal').style.display = 'block';
  }

  hideAddModal() {
    document.getElementById('addModal').style.display = 'none';
    this.editingPromptId = null;
    document.getElementById('promptTitle').value = '';
    document.getElementById('promptContent').value = '';
  }

  async deletePrompt(id) {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    this.prompts = this.prompts.filter(p => p.id !== id);
    await this.savePrompts();

    this.renderBasedOnFilter();
  }

}

const promptManager = new PromptManager();
