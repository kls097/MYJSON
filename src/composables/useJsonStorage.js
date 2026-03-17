// Storage composable using platform abstraction
import { ref } from 'vue'
import { dbPut, dbGet, dbGetAll, dbRemove } from '../platform/index.js'

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

    const result = dbPut(doc._id, doc)

    if (result.ok) {
      documents.value.unshift(doc)
      return doc
    } else {
      throw new Error(result.message || 'Save failed')
    }
  }

  // Load all documents
  const loadDocuments = () => {
    loading.value = true
    try {
      const docs = dbGetAll('json_doc_')
      documents.value = docs.sort((a, b) => b.timestamp - a.timestamp)
    } finally {
      loading.value = false
    }
  }

  // Delete document
  const deleteDocument = (doc) => {
    const result = dbRemove(doc._id)

    if (result.ok) {
      documents.value = documents.value.filter(d => d._id !== doc._id)
      return true
    } else {
      console.error('Delete failed:', result)
      return false
    }
  }

  // Update document
  const updateDocument = (doc) => {
    doc.timestamp = Date.now()
    doc.preview = doc.content.slice(0, 100)
    doc.size = new Blob([doc.content]).size

    const result = dbPut(doc._id, doc)

    if (result.ok) {
      return doc
    } else {
      throw new Error(result.message || 'Update failed')
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
