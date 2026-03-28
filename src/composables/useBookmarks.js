import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'myjson_bookmarks'

export function useBookmarks() {
  const bookmarks = ref([])

  onMounted(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) bookmarks.value = JSON.parse(saved)
    } catch {}
  })

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks.value))
  }

  const addBookmark = (name, content) => {
    bookmarks.value.unshift({
      id: Date.now(),
      name: name || '未命名',
      content,
      createdAt: new Date().toLocaleString()
    })
    if (bookmarks.value.length > 20) bookmarks.value.pop()
    save()
    return true
  }

  const removeBookmark = (id) => {
    bookmarks.value = bookmarks.value.filter(b => b.id !== id)
    save()
  }

  return { bookmarks, addBookmark, removeBookmark }
}
