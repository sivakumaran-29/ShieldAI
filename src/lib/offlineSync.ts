import { CandidateSession, saveCandidateSession } from './assessmentEngine'

const DB_NAME = 'shieldai_offline_db'
const STORE_NAME = 'offline_sessions'
const DB_VERSION = 1

export const initOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (e) => {
      console.error('IndexedDB Error:', e)
      reject(request.error)
    }

    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export const saveSessionOffline = async (session: CandidateSession): Promise<void> => {
  try {
    const db = await initOfflineDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(session)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    console.log(`[OfflineSync] Session ${session.id} auto-saved locally.`)
  } catch (err) {
    console.error('[OfflineSync] Failed to save session:', err)
  }
}

export const getOfflineSession = async (sessionId: string): Promise<CandidateSession | null> => {
  try {
    const db = await initOfflineDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    
    return await new Promise((resolve, reject) => {
      const request = store.get(sessionId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('[OfflineSync] Failed to retrieve session:', err)
    return null
  }
}

export const syncAllOfflineSessions = async (): Promise<void> => {
  if (!navigator.onLine) {
    console.log('[OfflineSync] Cannot sync, still offline.')
    return
  }

  try {
    const db = await initOfflineDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    const sessions = await new Promise<CandidateSession[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    if (sessions.length === 0) {
      console.log('[OfflineSync] No offline sessions to sync.')
      return
    }

    console.log(`[OfflineSync] Syncing ${sessions.length} offline sessions...`)
    
    for (const session of sessions) {
      const success = await saveCandidateSession(session)
      if (success) {
        // Remove from offline store
        const delTx = db.transaction(STORE_NAME, 'readwrite')
        delTx.objectStore(STORE_NAME).delete(session.id)
      }
    }

    console.log('[OfflineSync] Offline sync complete.')
  } catch (err) {
    console.error('[OfflineSync] Sync failed:', err)
  }
}
