/**
 * Zotero API Integration Service
 * Based on ZOTERO_INTEGRATION_BLUEPRINT.md
 */

export class ZoteroService {
  constructor() {
    this.baseUrl = 'https://api.zotero.org';
    this.apiKey = null;
    this.userID = null;
  }

  /**
   * Initialize with API key
   * @param {string} apiKey - Zotero API key
   * @returns {Promise<boolean>} Success
   */
  async initialize(apiKey) {
    try {
      const response = await fetch(`${this.baseUrl}/keys/${apiKey}`, {
        headers: { 'Zotero-API-Key': apiKey }
      });

      if (!response.ok) {
        throw new Error(`Invalid API key: ${response.status}`);
      }

      const data = await response.json();
      this.apiKey = apiKey;
      this.userID = data.userID;
      return true;
    } catch (error) {
      console.error('Zotero initialization error:', error);
      return false;
    }
  }

  /**
   * Create a collection (project)
   * @param {string} name - Collection name
   * @returns {Promise<string>} Collection key
   */
  async createCollection(name) {
    const libraryVersion = await this.getLibraryVersion();
    
    const response = await fetch(`${this.baseUrl}/users/${this.userID}/collections`, {
      method: 'POST',
      headers: {
        'Zotero-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'If-Unmodified-Since-Version': libraryVersion.toString()
      },
      body: JSON.stringify([{
        name,
        parentCollection: false
      }])
    });

    if (!response.ok) {
      throw new Error(`Failed to create collection: ${response.statusText}`);
    }

    const data = await response.json();
    return data.successful?.['0'];
  }

  /**
   * List top-level collections (projects)
   * @returns {Promise<Array>} Collections
   */
  async listCollections() {
    const response = await fetch(`${this.baseUrl}/users/${this.userID}/collections/top`, {
      headers: { 'Zotero-API-Key': this.apiKey }
    });

    if (!response.ok) {
      throw new Error(`Failed to list collections: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create an item (paper)
   * @param {Object} itemData - { title, creators, DOI, collections? }
   * @returns {Promise<string>} Item key
   */
  async createItem(itemData) {
    const libraryVersion = await this.getLibraryVersion();

    const item = {
      itemType: 'journalArticle',
      title: itemData.title,
      creators: itemData.creators || [],
      DOI: itemData.DOI || '',
      collections: itemData.collections || []
    };

    const response = await fetch(`${this.baseUrl}/users/${this.userID}/items`, {
      method: 'POST',
      headers: {
        'Zotero-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'If-Unmodified-Since-Version': libraryVersion.toString()
      },
      body: JSON.stringify([item])
    });

    if (!response.ok) {
      throw new Error(`Failed to create item: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success?.['0'];
  }

  /**
   * Add item to collection
   * @param {string} itemKey - Item key
   * @param {string} collectionKey - Collection key
   */
  async addItemToCollection(itemKey, collectionKey) {
    // Get current item
    const itemResponse = await fetch(`${this.baseUrl}/users/${this.userID}/items/${itemKey}`, {
      headers: { 'Zotero-API-Key': this.apiKey }
    });
    const itemData = await itemResponse.json();
    const currentCollections = itemData.data.collections || [];

    // Merge with new collection
    const updatedCollections = [...new Set([...currentCollections, collectionKey])];

    // Update item
    const updateResponse = await fetch(`${this.baseUrl}/users/${this.userID}/items/${itemKey}`, {
      method: 'PATCH',
      headers: {
        'Zotero-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'If-Unmodified-Since-Version': itemData.version.toString()
      },
      body: JSON.stringify({
        collections: updatedCollections
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to add item to collection: ${updateResponse.statusText}`);
    }
  }

  /**
   * Export collection as bibliography
   * @param {string} collectionKey - Collection key
   * @param {string} format - 'apa', 'mla', 'bibtex'
   * @returns {Promise<string>} Formatted bibliography
   */
  async exportCollection(collectionKey, format) {
    const style = format === 'apa' ? 'apa' : 
                  format === 'mla' ? 'modern-language-association' : null;
    
    const url = collectionKey
      ? `${this.baseUrl}/users/${this.userID}/collections/${collectionKey}/items?format=${format === 'bibtex' ? 'bibtex' : 'bib'}&style=${style}&limit=150`
      : `${this.baseUrl}/users/${this.userID}/items?format=${format === 'bibtex' ? 'bibtex' : 'bib'}&style=${style}&limit=150`;

    const response = await fetch(url, {
      headers: { 'Zotero-API-Key': this.apiKey }
    });

    if (!response.ok) {
      throw new Error(`Failed to export: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Get library version for write operations
   * @returns {Promise<number>} Library version
   */
  async getLibraryVersion() {
    const response = await fetch(`${this.baseUrl}/users/${this.userID}/items?limit=1`, {
      headers: { 'Zotero-API-Key': this.apiKey }
    });
    return parseInt(response.headers.get('Last-Modified-Version') || '0');
  }
}
