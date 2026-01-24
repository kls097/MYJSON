// utools.db storage composable
import { ref } from 'vue'

export function useJsonStorage() {
  const documents = ref([])
  const loading = ref(false)

  // Save new document
  const saveDocument = (content, name = '') => {
    const timestamp = Date.now()
    const autoName = name || `JSON_${new Date(timestamp).toLocaleString()}`

    const doc = {
      _id: `json_doc_${timestamp}`,
      name: autoName,
      content,
      timestamp,
      preview: content.slice(0, 100),
      size: new Blob([content]).size
    }

    if (window.utools && window.utools.db) {
      const result = window.utools.db.put(doc)

      if (result.ok) {
        doc._rev = result.rev
        documents.value.unshift(doc)
        return doc
      } else {
        throw new Error(result.message || 'Save failed')
      }
    } else {
      // Fallback for development without utools
      documents.value.unshift(doc)
      console.log('Saved (dev mode):', doc)
      return doc
    }
  }

  // Load all documents
  const loadDocuments = () => {
    loading.value = true
    try {
      if (window.utools && window.utools.db) {
        const docs = window.utools.db.allDocs('json_doc_')
        documents.value = docs.sort((a, b) => b.timestamp - a.timestamp)
      } else {
        // Dev mode - no documents
        documents.value = []
      }
    } finally {
      loading.value = false
    }
  }

  // Delete document
  const deleteDocument = (doc) => {
    if (window.utools && window.utools.db) {
      // uTools db.remove() 需要传入 _id 和 _rev
      const result = window.utools.db.remove(doc._id)

      if (result.ok) {
        documents.value = documents.value.filter(d => d._id !== doc._id)
        return true
      } else {
        console.error('Delete failed:', result)
        return false
      }
    } else {
      // Dev mode
      documents.value = documents.value.filter(d => d._id !== doc._id)
      console.log('Deleted (dev mode):', doc)
      return true
    }
  }

  // Update document
  const updateDocument = (doc) => {
    doc.timestamp = Date.now()
    doc.preview = doc.content.slice(0, 100)
    doc.size = new Blob([doc.content]).size

    if (window.utools && window.utools.db) {
      const result = window.utools.db.put(doc)

      if (result.ok) {
        doc._rev = result.rev
        return doc
      } else {
        throw new Error(result.message || 'Update failed')
      }
    } else {
      // Dev mode
      console.log('Updated (dev mode):', doc)
      return doc
    }
  }

  return {
    documents,
    loading,
    saveDocument,
    loadDocuments,
    deleteDocument,
    updateDocument
  }
}
